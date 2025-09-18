# scripts/build_graph_outputs.py
import os, json, yaml
from pathlib import Path

ROOT     = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data_yml"
REL_DIR  = DATA_DIR / "relationships"

OUT_DIR  = ROOT / "docs" / "data"
OUT_DIR.mkdir(parents=True, exist_ok=True)

LITE_PATH    = OUT_DIR / "graph_data.lite.json"
DETAILS_PATH = OUT_DIR / "node_details.json"


from datetime import date, datetime
from decimal import Decimal
from pathlib import Path as _Path  # alias to avoid clashing with your Path

def _to_json_safe(obj):
    # Recursively convert objects not supported by JSON
    if isinstance(obj, (date, datetime)):
        return obj.isoformat()
    if isinstance(obj, Decimal):
        return float(obj)
    if isinstance(obj, _Path):
        return str(obj)
    if isinstance(obj, set):
        return sorted(_to_json_safe(v) for v in obj)
    if isinstance(obj, tuple):
        return [_to_json_safe(v) for v in obj]
    if isinstance(obj, list):
        return [_to_json_safe(v) for v in obj]
    if isinstance(obj, dict):
        return { str(k): _to_json_safe(v) for k, v in obj.items() }
    return obj

# Helper: compact join, safe types
def _coalesce(*vals):
  for v in vals:
    if isinstance(v, str) and v.strip():
      return v.strip()
  return ""

def _slug_from(file: Path):
  return file.stem  # keep it simple and stable

def _type_class(t: str, category: str):
  t = (t or category or "other").lower()
  if t == "organization": return "org"
  return t

def _search_blob(label, tags, desc, limit=240):
  base = " ".join([label or "", " ".join(tags or []), (desc or "")]).strip()
  base = " ".join(base.split())  # collapse whitespace
  return base[:limit]

def _position_from_yaml(data: dict):
  # OPTIONAL: support precomputed positions if present in YAML, e.g.:
  # position: { x: 120, y: 480 }
  pos = data.get("position") or {}
  try:
    x = float(pos.get("x")); y = float(pos.get("y"))
    return {"x": x, "y": y}
  except Exception:
    return None

def collect_nodes_and_details():
  lite_nodes = []
  details = {}
  seen = set()

  for category in DATA_DIR.iterdir():
    if not category.is_dir() or category.name == "relationships":
      continue

    for file in category.glob("*.yaml"):
      if file.name.lower().startswith("template") or file.name.startswith("0_template"):
        continue

      node_id = file.stem
      if node_id in seen: 
        continue

      with open(file, encoding="utf-8") as f:
        try:
          data = yaml.safe_load(f) or {}
        except yaml.YAMLError as e:
          print(f"YAML error in {file}: {e}")
          continue

      label   = _coalesce(data.get("name"), node_id)
      ntype   = data.get("@type", category.name)
      cls     = _type_class(ntype, category.name)
      slug    = data.get("slug") or _slug_from(file)
      tags    = data.get("tags") or []
      desc    = data.get("description") or data.get("summary") or ""
      pos     = _position_from_yaml(data)  # optional

      # LITE node (small!)
      n = {"id": node_id, "l": label, "t": cls, "s": slug, "sb": _search_blob(label, tags, desc)}
      if pos: 
        n["x"] = pos["x"]; n["y"] = pos["y"]
      lite_nodes.append(n)

      # DETAILS node (for side panel, richer)
      org_fields = (data.get("organization_fields") or {})
      details[node_id] = {
        "label": label,
        "slug": slug,
        "type": ntype,
        "summary": desc,
        "tags": tags,
        "website": data.get("website"),
        "projects": (org_fields.get("projects") or []),
        "persons": (org_fields.get("persons") or []),
        "organisation_type": org_fields.get("organisation_type"),
        "region": org_fields.get("region"),
        "notes": data.get("notes"),
        # page_url optional, if you later add a docs page per node
        "page_url": data.get("page_url")
      }

      seen.add(node_id)

  return lite_nodes, details, seen

def collect_edges(seen_nodes):
    edges = []
    skipped = 0
    MAX_LOG = 20  # show up to 20 examples
    for file in REL_DIR.glob("*.yaml"):
        if file.name.startswith("0_template"):
            continue
        with open(file, encoding="utf-8") as f:
            try:
                data = yaml.safe_load(f) or {}
            except yaml.YAMLError as e:
                print(f"YAML error in {file}: {e}")
                continue
        src = data.get("source"); tgt = data.get("target")
        if not src or not tgt:
            if skipped < MAX_LOG:
                print(f"Incomplete edge in {file}: missing source or target")
            skipped += 1
            continue
        if src not in seen_nodes or tgt not in seen_nodes:
            if skipped < MAX_LOG:
                print(f"Skipping edge with missing node(s): {src}->{tgt} in {file.name}")
            skipped += 1
            continue
        rel = data.get("relationship_type", "relatesTo")
        edges.append([src, tgt, rel])
    if skipped:
        print(f"(Skipped {skipped} edges that referenced unknown nodes)")
    return edges


def write_json(path: Path, obj):
    safe = _to_json_safe(obj)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(safe, f, separators=(",", ":"), ensure_ascii=False)
    print(f"Wrote {path} ({path.stat().st_size} bytes)")


if __name__ == "__main__":
    print("Building lite graph + details...")
    nodes, details, seen = collect_nodes_and_details()
    edges = collect_edges(seen)

    print(f"Nodes: {len(nodes)}  |  Edges: {len(edges)}  |  Unique IDs: {len(seen)}")

    write_json(LITE_PATH, {"nodes": nodes, "edges": edges})
    write_json(DETAILS_PATH, details)

    # LITE payload (tiny)
    write_json(LITE_PATH, {"nodes": nodes, "edges": edges})

    # DETAILS payload (rich)
    write_json(DETAILS_PATH, details)
