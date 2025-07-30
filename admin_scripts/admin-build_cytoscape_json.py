# scripts/build_cytoscape_json.py

import yaml
import json
from pathlib import Path
from shutil import copyfile

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data_yml"
REL_DIR = DATA_DIR / "relationships"
OUT_PATH = DATA_DIR / "graph_data.json"

def get_entities():
    elements = []
    seen_nodes = set()
    for category in DATA_DIR.iterdir():
        if category.name == "relationships" or not category.is_dir():
            continue
        for file in category.glob("*.yaml"):
            if file.name.lower().startswith("template") or file.name.startswith("0_template"):
                continue
            node_id = file.stem
            if node_id in seen_nodes:
                continue
            with open(file, encoding="utf-8") as f:
                try:
                    data = yaml.safe_load(f)
                except yaml.YAMLError as e:
                    print(f"YAML error in {file}: {e}")
                    continue
            label = data.get("name") or node_id
            if not isinstance(label, str) or not label.strip():
                print(f"Skipping node with invalid or missing label: {node_id}")
                continue
            node_type = data.get("@type", category.name).lower()
            node_class = {
                "organization": "org",
                "service": "service",
                "event": "event",
                "plan": "plan",
                "rule": "rule",
                "collection": "collection",
                "person": "person",
                "relationship": "relationship",
                "dataset": "dataset", # future use (not sccm compliant)
                "tool": "tool" # future use (not sccm compliant)
            }.get(node_type, "default")
            elements.append({
                "data": {
                    "id": node_id,
                    "label": label,
                    "type": data.get("@type", category.name).upper(),
                    "group": "nodes"
                },
                "classes": node_class
            })

            seen_nodes.add(node_id)
    return elements, seen_nodes

def get_relationships(seen_nodes):
    edges = []
    for file in REL_DIR.glob("*.yaml"):
        if file.name.startswith("0_template"):
            continue
        with open(file, encoding="utf-8") as f:
            try:
                data = yaml.safe_load(f)
            except yaml.YAMLError as e:
                print(f"YAML error in {file}: {e}")
                continue
            source = data.get("source")
            target = data.get("target")
            if not source or not target:
                print(f"Incomplete edge in {file}: missing source or target")
                continue
            if source not in seen_nodes or target not in seen_nodes:
                print(f"Skipping edge with missing node(s): {source} -> {target} in {file.name}")
                continue
            relationship_type = data.get("relationship_type", "relatesTo")
            edges.append({
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
    print("Building Cytoscape JSON from YAMLs...")
    nodes, seen_nodes = get_entities()
    edges = get_relationships(seen_nodes)

    if not nodes:
        raise ValueError("No nodes were generated. Check input YAMLs.")
    if not edges:
        print("No edges generated. You may only see isolated nodes.")

    graph = {"elements": nodes + edges}

    with open(OUT_PATH, "w", encoding="utf-8") as f:
        json.dump(graph, f, indent=2, ensure_ascii=False)
    print(f"Graph JSON written to: {OUT_PATH}")

    docs_data_path = ROOT / "docs" / "data" / "graph_data.json"
    docs_data_path.parent.mkdir(parents=True, exist_ok=True)
    copyfile(OUT_PATH, docs_data_path)
    print(f"Copied graph JSON to: {docs_data_path}")
