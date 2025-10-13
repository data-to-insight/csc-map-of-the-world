# admin_scripts/build_explorer_assets.py

from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "docs" / "data"
SRC  = DATA / "graph_data.lite.json"

OUT_SEARCH = DATA / "search_index.json"   # [{id,l,t,s,tags?},...]
OUT_ADJ    = DATA / "adjacency.json"      # {id:[neighborId,...], ...}
OUT_LITE   = DATA / "lite_index.json"     # {id:{id,l,t,s,x,y,sb?}}

def main():
    if not SRC.exists():
        raise SystemExit(f"Missing {SRC} — build your graph_data.lite.json first.")

    raw = json.loads(SRC.read_text(encoding="utf-8"))

    nodes = raw.get("nodes", [])
    edges = raw.get("edges", [])

    # lite_index: quick lookup for node metadata
    lite_index = {}
    # search_index: tiny array to scan in-browser (no heavy lib requ)
    search_index = []
    # adjacency: neighbors by id
    adj = {}

    for n in nodes:
        nid = n["id"]
        obj = {
            "id": nid,
            "l": n.get("l") or nid,
            "t": "org" if n.get("t") == "organization" else (n.get("t") or "other"),
            "s": n.get("s") or "",
            "x": n.get("x"),
            "y": n.get("y"),
        }
        if "sb" in n:
            obj["sb"] = n["sb"]
        lite_index[nid] = obj

        # minimal search doc (label + type + slug-ish)
        search_index.append({
            "id": nid,
            "l": obj["l"],
            "t": obj["t"],
            "s": obj["s"],
        })

        adj[nid] = []

    for e in edges:
        src, tgt = e[0], e[1]
        # undirected adjacency for exploration
        if src in adj and tgt in adj:
            adj[src].append(tgt)
            adj[tgt].append(src)

    OUT_LITE.write_text(json.dumps(lite_index, ensure_ascii=False, separators=(",",":")), encoding="utf-8")
    OUT_SEARCH.write_text(json.dumps(search_index, ensure_ascii=False, separators=(",",":")), encoding="utf-8")
    OUT_ADJ.write_text(json.dumps(adj, ensure_ascii=False, separators=(",",":")), encoding="utf-8")

    print(f"Wrote {OUT_LITE} ({OUT_LITE.stat().st_size} bytes)")
    print(f"Wrote {OUT_SEARCH} ({OUT_SEARCH.stat().st_size} bytes)")
    print(f"Wrote {OUT_ADJ} ({OUT_ADJ.stat().st_size} bytes)")

if __name__ == "__main__":
    main()
