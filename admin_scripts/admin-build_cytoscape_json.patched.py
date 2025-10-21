# admin_scripts/admin-build_cytoscape_json.py

# example output
# Graph JSON written: /workspaces/csc-map-of-the-world/docs/data/graph_data.json (minified, 149646 bytes)
# Crosswalk written:  /workspaces/csc-map-of-the-world/docs/data/crosswalk.json (minified, 41078 bytes)

import os
import re
import json
import yaml
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data_yml"
REL_DIR  = DATA_DIR / "relationships"

# Single output location (site assets)
OUT_DIR        = ROOT / "docs" / "data"
GRAPH_PATH     = OUT_DIR / "graph_data.json"
CROSSWALK_PATH = OUT_DIR / "crosswalk.json"

# slug -> { id, label, type, slug, source_path, page_url }
CROSSWALK = {}

# ---------------- helpers ----------------
def write_json(path: Path, payload, *, minify: bool = True):
    """Write JSON either minified (default) or pretty, ensure parent dir exist"""
    opts = {"ensure_ascii": False}
    if minify:
        opts.update(separators=(",", ":"))
    else:
        opts.update(indent=2)
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(payload, f, **opts)

def kebab(s: str) -> str:
    if s is None:
        return ""
    s = re.sub(r"[^a-zA-Z0-9/_-]+", " ", str(s)).strip().lower()
    s = s.replace(" ", "-")
    return re.sub(r"-{2,}", "-", s)

def slug_from_path(path: Path, base: Path) -> str:
    """Derive stable slug from file path relative to data_yml/ (no extension)"""
    rel = path.relative_to(base).with_suffix("")
    segs = [kebab(p) for p in rel.parts]
    return "/".join(segs)

def as_list(v):
    if v is None:
        return []
    if isinstance(v, list):
        return [str(x) for x in v if x is not None]
    return [str(v)]

def pick_summary(d: dict) -> str:
    for k in ("summary", "description"):
        if d.get(k):
            return str(d[k])
    return ""

def singularize(s: str) -> str:
    if not s:
        return s
    return s[:-1] if s.endswith("s") else s
# -----------------------------------------


def get_entities():
    elements = []
    seen_nodes = set()

    for category in DATA_DIR.iterdir():
        if not category.is_dir() or category.name == "relationships":
            continue

        for file in category.glob("*.yaml"):
            if file.name.lower().startswith("template") or file.name.startswith("0_template"):
                continue

            with open(file, encoding="utf-8") as f:


                try:


                    data = yaml.safe_load(f) or {}


                except yaml.YAMLError as e:


                    print(f"YAML error in {file}: {e}")


                    continue


            


            # prefer explicit id field, else file stem


            node_id = (data.get("id") or file.stem)


            if node_id in seen_nodes:


                continue

            label = data.get("name") or node_id
            if not isinstance(label, str) or not label.strip():
                print(f"Skipping node with invalid or missing label: {node_id}")
                continue

            # Normalize type: prefer @type else folder name (singularized)
            raw_type = (data.get("@type") or category.name).strip().lower()
            if "@type" not in data:
                raw_type = singularize(raw_type)

            node_class = {
                "organization": "org", "organisation": "org",
                "service": "service",
                "event": "event",
                "plan": "plan",
                "rule": "rule",
                "collection": "collection",
                "person": "person",
                "relationship": "relationship",
                "dataset": "dataset",   # reserved/future
                "tool": "tool"          # reserved/future
            }.get(raw_type, "default")

            tags = as_list(data.get("tags"))
            summary = pick_summary(data)
            slug = data.get("slug") or slug_from_path(file, DATA_DIR)

            short_summary = (summary or "")[:500]
            search_blob = " ".join([label, *tags, short_summary, slug, raw_type]).lower()

            source_path = str(file.relative_to(ROOT)).replace("\\", "/")
            page_url = f"{slug}/"  # front-end prefixes with SITE_BASE

            # Generic extras (optional)
            website = data.get("website")
            notes = data.get("notes")
            version = data.get("version")
            date_published = data.get("date_published")
            super_concept = data.get("super_concept")
            sub_concept = data.get("sub_concept")

            # Organization-specific extras (if present)
            org_fields = (
                data.get("organization_fields") or
                data.get("organisation_fields") or
                {}
            )
            organisation_type = org_fields.get("organisation_type") or org_fields.get("organization_type")
            region = org_fields.get("region")
            projects = as_list(org_fields.get("projects"))
            persons = org_fields.get("persons") or []
            norm_persons = []
            if isinstance(persons, list):
                for p in persons:
                    if isinstance(p, dict):
                        norm_persons.append({
                            "name": str(p.get("name", "")),
                            "role": str(p.get("role", "")) if p.get("role") is not None else "",
                            "from": str(p.get("from", "")) if p.get("from") is not None else ""
                        })
                    else:
                        norm_persons.append({"name": str(p), "role": "", "from": ""})

            el = {
                "group": "nodes",
                "data": {
                    "id": node_id,
                    "label": label,
                    "type": (data.get("@type") or category.name).upper(),
                    "group": "nodes",
                    "slug": slug,
                    "source_path": source_path,
                    "page_url": page_url,
                    "tags": tags,
                    "summary": summary,
                    "search_blob": search_blob,
                    "website": website,
                    "notes": notes,
                    "version": str(version) if version is not None else None,
                    "date_published": str(date_published) if date_published is not None else None,
                    "super_concept": super_concept,
                    "sub_concept": sub_concept,
                    "organisation_type": organisation_type,
                    "region": region,
                    "projects": projects,
                    "persons": norm_persons,
                },
                "classes": node_class
            }
            elements.append(el)
            seen_nodes.add(node_id)

            # Crosswalk entry
            CROSSWALK[slug] = {
                "id": node_id,
                "label": label,
                "type": (data.get("@type") or category.name).upper(),
                "slug": slug,
                "source_path": source_path,
                "page_url": page_url
            }

    return elements, seen_nodes


def get_relationships(seen_nodes):
    edges = []
    for file in REL_DIR.glob("*.yaml"):
        if file.name.startswith("0_template"):
            continue
        with open(file, encoding="utf-8") as f:
            try:
                data = yaml.safe_load(f) or {}
            except yaml.YAMLError as e:
                print(f"YAML error in {file}: {e}")
                continue

        def resolve_id(x):


            if not x:


                return x


            if x in seen_nodes:


                return x


            # try slug lookup from CROSSWALK keys, which are slugs


            cw = CROSSWALK.get(x)


            if cw and cw.get("id"):


                return cw["id"]


            return x


        


        source = resolve_id(data.get("source"))


        target = resolve_id(data.get("target"))

        if not source or not target:
            print(f"Incomplete edge in {file}: missing source or target")
            continue
        if source not in seen_nodes or target not in seen_nodes:
            print(f"Skipping edge with missing node(s): {source} -> {target} in {file.name}")
            continue

        relationship_type = data.get("relationship_type", "relatesTo")
        edges.append({
            "group": "edges",
            "data": {
                "source": source,
                "target": target,
                "label": relationship_type,
                "relationship_type": relationship_type,
                "group": "edges"
            }
        })
    return edges


if __name__ == "__main__":

    MINIFY = True # for now, CLI not in use
    # Output format toggle (env only): GRAPH_MINIFY=0 -> pretty; else minified (default)
    # MINIFY = os.getenv("GRAPH_MINIFY", "1") != "0"

    print("Building Cytoscape JSON from YAMLs...")
    nodes, seen_nodes = get_entities()
    edges = get_relationships(seen_nodes)

    if not nodes:
        raise ValueError("No nodes were generated. Check input YAMLs.")
    if not edges:
        print("No edges generated. You may see isolated nodes.")

    graph = {"elements": nodes + edges}

    # Single outputs (no intermediate copies)
    write_json(GRAPH_PATH, graph, minify=MINIFY)
    print(f"Graph JSON written: {GRAPH_PATH} ({'minified' if MINIFY else 'pretty'}, {GRAPH_PATH.stat().st_size} bytes)")

    write_json(CROSSWALK_PATH, CROSSWALK, minify=MINIFY)
    print(f"Crosswalk written:  {CROSSWALK_PATH} ({'minified' if MINIFY else 'pretty'}, {CROSSWALK_PATH.stat().st_size} bytes)")
