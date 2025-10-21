#!/usr/bin/env python3
"""
Generate synthetic ORGANIZATION YAMLs (and optional RELATIONSHIP YAMLs) for scaling tests.

Defaults:
- ORG outdir: /workspaces/csc-map-of-the-world/data_yml/organizations
- REL outdir: /workspaces/csc-map-of-the-world/data_yml/relationships
- ORG filename: {prefix}{index:04d}.yaml  (e.g., test_0001.yaml)
- REL filename: {rel_prefix}{pair_index:04d}.yaml (e.g., testrel_0001.yaml)
- ORG name: TEST{index} (e.g., TEST1)
- REL source and target identifiers: file stems (e.g., test_0001) by default

Usage examples:
  # Create 10 orgs and 5 pairwise relationships (1↔2, 3↔4, …)
  python admin_scripts/gen_test_orgs.py -n 10 --make-relationships

  # Clean both org + rel test files first, then create 200
  python admin_scripts/dev-testing-scale_up_yml.py -n 200 --clean-first --make-relationships

  # Use different prefixes and start index
  python admin_scripts/dev-testing-scale_up_yml.py -n 50 -s 101 -p tmporg_ --rel-prefix tmprel_ --make-relationships

  # Use slugs instead of file stems if you really want slugs (changed to filestem from slug)
  python admin_scripts/dev-testing-scale_up_yml.py -n 10 --make-relationships --id-strategy filestem

  e.g.
  python admin_scripts/dev-testing-scale_up_yml.py -n 10 --clean-first --make-relationships --id-strategy filestem
  python admin_scripts/dev-testing-scale_up_yml.py -n 5000 --clean-first --make-relationships --id-strategy filestem
"""

import argparse
from pathlib import Path
import sys
import glob
import re
from typing import List, Tuple

# Prefer ruamel.yaml for nicer formatting; fall back to PyYAML if unavailable.
try:
    from ruamel.yaml import YAML
    from ruamel.yaml.scalarstring import FoldedScalarString
    _USE_RUAMEL = True
    yaml = YAML()
    yaml.indent(mapping=2, sequence=4, offset=2)
    yaml.explicit_start = False
    yaml.explicit_end = False
except Exception:
    _USE_RUAMEL = False
    import yaml  # type: ignore

ORG_OUTDIR_DEFAULT = "/workspaces/csc-map-of-the-world/data_yml/organizations"
REL_OUTDIR_DEFAULT = "/workspaces/csc-map-of-the-world/data_yml/relationships"

def slugify(s: str) -> str:
    """Simple slug to mirror 'data_to_insight'-style ids (lowercase + underscores)"""
    s = s.strip().lower()
    s = re.sub(r"\s+", "_", s)
    s = re.sub(r"[^a-z0-9_]+", "_", s)
    s = re.sub(r"_+", "_", s)
    return s.strip("_")

def build_org_payload(idx: int):
    """Construct the dict for one ORGANIZATION test record"""
    name = f"TEST{idx}"
    desc = "-"
    notes = "-"

    org_block = {
        "@type": "ORGANIZATION",
        "super_concept": "AGENT",   # SCCM root (AGENT, OBJECT, EVENT, etc.)
        "sub_concept": "",          # optional sub-role
        "name": name,
        #
        "slug": slugify(name),
        "description": desc,
        # --- ORGANIZATION-specific fields ---
        "organization_fields": {
            "organisation_type": "",
            "region": "England",
            "projects": [""],  # renders as single "-" placeholder
            "persons": [
                {"name": "", "role": "", "from": "1900-01-01"}
            ],
        },
        # --- Shared metadata ---
        "tags": ["scaling"],
        "version": "2025.07",
        "date_published": "2020-01-01",
        "website": "https://www.example.org.uk",
        "notes": notes,
    }

    if _USE_RUAMEL:
        org_block["description"] = FoldedScalarString(desc)
        org_block["notes"] = FoldedScalarString(notes)

    return org_block

def build_relationship_payload(source_id: str, target_id: str, rel_type: str = "collaboratesWith", label: str = ""):
    """Construct the dict for one RELATIONSHIP record."""
    if not label:
        label = f"{source_id} | {target_id} {rel_type}"
    return {
        "@type": "RELATIONSHIP",
        "name": label,
        "source": source_id,
        "target": target_id,
        "relationship_type": rel_type,
        "tags": ["scaling"],
    }

def write_yaml(obj, path: Path, overwrite: bool = False):
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists() and not overwrite:
        raise FileExistsError(f"Refusing to overwrite existing file: {path}")
    if _USE_RUAMEL:
        with path.open("w", encoding="utf-8") as f:
            yaml.dump(obj, f)
    else:
        with path.open("w", encoding="utf-8") as f:
            yaml.safe_dump(obj, f, sort_keys=False, allow_unicode=True, default_flow_style=False)

def clean_prefix(outdir: Path, prefix: str) -> int:
    """Delete files in outdir matching prefix*.yaml. Returns count removed."""
    pattern = str(outdir / f"{prefix}*.yaml")
    removed = 0
    for path in glob.glob(pattern):
        try:
            Path(path).unlink()
            removed += 1
        except Exception as e:
            print(f"Warning: could not remove {path}: {e}", file=sys.stderr)
    return removed

def pair_indices(indices: List[int]) -> List[Tuple[int, int]]:
    """Adjacent pairs: [1,2,3,4,5] -> [(1,2),(3,4)] (drop last if odd)."""
    pairs = []
    for i in range(0, len(indices) - 1, 2):
        pairs.append((indices[i], indices[i+1]))
    return pairs

def main():
    p = argparse.ArgumentParser(description="Generate ORGANIZATION (and optional RELATIONSHIP) test YAML files")
    p.add_argument("--count", "-n", type=int, required=True, help="Number of ORG files to generate")
    p.add_argument("--start", "-s", type=int, default=1, help="Starting index for TEST names and file numbering (default: 1)")
    p.add_argument("--prefix", "-p", default="test_", help="ORG filename prefix (default: 'test_')")
    p.add_argument("--outdir", "-o", default=ORG_OUTDIR_DEFAULT, help=f"ORG output directory (default: {ORG_OUTDIR_DEFAULT})")
    p.add_argument("--overwrite", action="store_true", help="Allow overwriting existing ORG/REL files (off by default)")
    p.add_argument("--clean-first", action="store_true", help="Delete existing files matching prefixes before generating")

    # Relationship options
    p.add_argument("--make-relationships", action="store_true", help="Also create RELATIONSHIP YAMLs pairing adjacent new ORGs")
    p.add_argument("--rel-outdir", default=REL_OUTDIR_DEFAULT, help=f"REL output directory (default: {REL_OUTDIR_DEFAULT})")
    p.add_argument("--rel-prefix", default="testrel_", help="REL filename prefix (default: 'testrel_')")
    p.add_argument("--rel-type", default="collaboratesWith", help="relationship_type value (default: collaboratesWith)")
    p.add_argument("--id-strategy", choices=["slug", "name", "filestem"], default="filestem",
                   help="Which identifier to use in REL source/target (default: slug). 'filestem' uses the ORG filename stem (e.g., test_0001)")

    args = p.parse_args()

    org_outdir = Path(args.outdir)
    rel_outdir = Path(args.rel_outdir)

    if args.clean_first:
        removed_org = clean_prefix(org_outdir, args.prefix)
        removed_rel = clean_prefix(rel_outdir, args.rel_prefix)
        print(f"Cleaned {removed_org} ORG file(s) and {removed_rel} REL file(s).")

    # --- Generate ORGs
    created_orgs = 0
    file_stems: List[str] = []
    ids_for_relationships: List[str] = []

    for i in range(args.start, args.start + args.count):
        payload = build_org_payload(i)
        fname = f"{args.prefix}{i:04d}.yaml"  # e.g., test_0001.yaml
        fpath = org_outdir / fname

        payload["id"] = fpath.stem   # e.g. test_0001

        # Determine identifier for relationships
        if args.id_strategy == "slug":
            id_value = payload.get("slug", slugify(payload["name"]))
        elif args.id_strategy == "name":
            id_value = payload["name"]
        else:  # filestem
            id_value = fpath.stem

        try:
            write_yaml(payload, fpath, overwrite=args.overwrite)
            created_orgs += 1
            file_stems.append(fpath.stem)
            ids_for_relationships.append(id_value)
        except FileExistsError as e:
            print(str(e), file=sys.stderr)
        except Exception as e:
            print(f"Error writing {fpath}: {e}", file=sys.stderr)

    print(f"ORGs: created {created_orgs} file(s) in {org_outdir}")

    # --- Generate RELATIONSHIPS (adjacent pairs)
    created_rels = 0
    if args.make_relationships and ids_for_relationships:
        pairs = pair_indices(list(range(len(ids_for_relationships))))
        for pair_idx, (a, b) in enumerate(pairs, start=1):
            source_id = ids_for_relationships[a]
            target_id = ids_for_relationships[b]
            label = f"{source_id} | {target_id} {args.rel_type}"
            rel_payload = build_relationship_payload(source_id, target_id, rel_type=args.rel_type, label=label)
            rel_fname = f"{args.rel_prefix}{pair_idx:04d}.yaml"
            rel_fpath = rel_outdir / rel_fname
            try:
                write_yaml(rel_payload, rel_fpath, overwrite=args.overwrite)
                created_rels += 1
            except FileExistsError as e:
                print(str(e), file=sys.stderr)
            except Exception as e:
                print(f"Error writing {rel_fpath}: {e}", file=sys.stderr)

        if len(ids_for_relationships) % 2 == 1:
            leftover = ids_for_relationships[-1]
            print(f"Note: odd count; leftover org with no pair: {leftover}")

    if args.make_relationships:
        print(f"RELATIONSHIPS: created {created_rels} file(s) in {rel_outdir}")

if __name__ == "__main__":
    main()
