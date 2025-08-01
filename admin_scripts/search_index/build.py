import os
import json
import pandas as pd
from pathlib import Path

# loader imports
from loaders.web import load_from_data_web
from loaders.yml import load_from_data_yml
from loaders.repos import load_from_data_repos
from loaders.published import load_from_data_published

# Output config
SAVE_PARQUET = False
OUTPUT_JSON_PATH = Path("docs/data/search_index.json") # front-end search index
OUTPUT_PARQUET_PATH = Path("admin_scripts/docs_index.parquet") # not used in front-end


def build_search_index():
    all_entries = []

    # web scraped
    print("Loading from data_web...")
    web_entries = load_from_data_web()
    print(f"data_web: {len(web_entries)} entries")
    all_entries.extend(web_entries)

    # SCCM defined objects from network diagram
    print("Loading from data_yml...")
    yml_entries = load_from_data_yml()
    print(f"data_yml: {len(yml_entries)} entries")
    all_entries.extend(yml_entries)

    # files pulled from defined repos (usually only README)
    print("Loading from data_repos...")
    repo_entries = load_from_data_repos(force_refresh=False) # or load_from_data_repos()
    print(f"data_repos: {len(repo_entries)} entries")
    all_entries.extend(repo_entries)

    # pdf documents, e.g DfE, guidance, reports...
    # typically the highest data overheads(incl. bytesize)
    print("Loading from data_published...")
    published_entries = load_from_data_published()
    print(f"data_published: {len(published_entries)} entries")
    all_entries.extend(published_entries)

    # Save search_index.json
    OUTPUT_JSON_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(all_entries, f, indent=2)

    print(f"\nSaved JSON search index: {OUTPUT_JSON_PATH} ({round(os.path.getsize(OUTPUT_JSON_PATH)/1024, 2)} KB)")

    if SAVE_PARQUET:
        df = pd.DataFrame(all_entries)
        OUTPUT_PARQUET_PATH.parent.mkdir(parents=True, exist_ok=True)
        df.to_parquet(OUTPUT_PARQUET_PATH, index=False)
        print(f"Saved Parquet: {OUTPUT_PARQUET_PATH} ({round(os.path.getsize(OUTPUT_PARQUET_PATH)/1024**2, 2)} MB)")


if __name__ == "__main__":
    build_search_index()
