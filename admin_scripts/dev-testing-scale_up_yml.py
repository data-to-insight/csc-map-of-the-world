#!/usr/bin/env python3
"""
Generate synthetic ORGANIZATION YAMLs for scaling tests.

Defaults:
- Output dir: /workspaces/csc-map-of-the-world/data_yml/organizations
- Filename pattern: {prefix}{index:04d}.yaml  (e.g., test_0001.yaml)
- Name field inside each file: TEST{index}    (e.g., TEST1)
"""

import argparse
from pathlib import Path
import sys
import glob

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

DEFAULT_OUTDIR = "/workspaces/csc-map-of-the-world/data_yml/organizations"

def build_org_payload(idx: int):
    """Construct the dict for one ORGANIZATION test record."""
    name = f"TEST{idx}"
    desc = "-"
    notes = "-"

    org_block = {
        "@type": "ORGANIZATION",
        "super_concept": "AGENT",   # SCCM root (AGENT, OBJECT, EVENT, etc.)
        "sub_concept": "",          # optional sub-role
        "name": name,
        "description": desc,
        # --- ORGANIZATION-specific fields ---
        "organization_fields": {
            "organisation_type": "",
            "region": "England",
            "projects": [""],  # yields a single "-" item in YAML
            "persons": [
                {"name": "", "role": "", "from": "1900-01-01"}
            ],
        },
        # --- Shared metadata (optional) ---
        "tags": ["scaling"],
        "version": "2025.07",
        "date_published": "2020-01-01",
        "website": "https://www.adcs.org.uk",
        "notes": notes,
    }

    if _USE_RUAMEL:
        # Make description/notes use folded style like ">\n  -"
        org_block["description"] = FoldedScalarString(desc)
        org_block["notes"] = FoldedScalarString(notes)

    return org_block


def write_yaml(obj, path: Path, overwrite: bool = False):
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists() and not overwrite:
        raise FileExistsError(f"Refusing to overwrite existing file: {path}")
    if _USE_RUAMEL:
        with path.open("w", encoding="utf-8") as f:
            yaml.dump(obj, f)
    else:
        # PyYAML fallback (formatting may differ slightly)
        with path.open("w", encoding="utf-8") as f:
            yaml.safe_dump(
                obj, f, sort_keys=False, allow_unicode=True, default_flow_style=False
            )


def main():
    p = argparse.ArgumentParser(description="Generate ORGANIZATION test YAML files.")
    p.add_argument("--count", "-n", type=int, required=True,
                   help="Number of files to generate.")
    p.add_argument("--start", "-s", type=int, default=1,
                   help="Starting index for TEST names and file numbering (default: 1).")
    p.add_argument("--prefix", "-p", default="test_",
                   help="Filename prefix (default: 'test_').")
    p.add_argument("--outdir", "-o", default=DEFAULT_OUTDIR,
                   help=f"Output directory (default: {DEFAULT_OUTDIR})")
    p.add_argument("--overwrite", action="store_true",
                   help="Allow overwriting existing files (off by default).")
    p.add_argument("--clean-first", action="store_true",
                   help="Delete existing files in outdir matching '{prefix}*.yaml' before generating.")
    args = p.parse_args()

    outdir = Path(args.outdir)

    if args.clean_first:
        pattern = str(outdir / f"{args.prefix}*.yaml")
        removed = 0
        for path in glob.glob(pattern):
            try:
                Path(path).unlink()
                removed += 1
            except Exception as e:
                print(f"Warning: could not remove {path}: {e}", file=sys.stderr)
        print(f"Cleaned {removed} files matching {pattern}")

    created = 0
    for i in range(args.start, args.start + args.count):
        payload = build_org_payload(i)
        fname = f"{args.prefix}{i:04d}.yaml"  # test_0001.yaml
        fpath = outdir / fname
        try:
            write_yaml(payload, fpath, overwrite=args.overwrite)
            created += 1
        except FileExistsError as e:
            print(str(e), file=sys.stderr)
        except Exception as e:
            print(f"Error writing {fpath}: {e}", file=sys.stderr)

    print(f"Done. Created {created} file(s) in {outdir}")


if __name__ == "__main__":
    main()
