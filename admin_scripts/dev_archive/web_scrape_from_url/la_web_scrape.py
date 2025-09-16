# from the /data_web/sites_to_scrape.yaml visit the listed pages and scrape content
# into txt files. These are then picked up as part of the main search index build

import pandas as pd
import time
import sys
import importlib.util

try:
    from duckduckgo_search.ddg import ddg
    duckduckgo_search_available = True
except ImportError:
    duckduckgo_search_available = False
    
try:
    from googlesearch import search as google_search
    google_search_available = True
except ImportError:
    google_search_available = False



# --- CONFIG ---
INPUT_FILE = "./admin_scripts/la_web_scrape_la_url_lookup.csv"
OUTPUT_FILE = "./admin_scripts/la_web_scrape_la_url_lookup_enriched.csv"
MAX_RESULTS = 3
PAUSE_BETWEEN_QUERIES = 1.0
SEARCH_ENGINE = "duckduckgo"  # "google" or "duckduckgo"

services_keywords = ["children's services", "children's social care", "early help", "safeguarding", "mash referral"]
jobs_keywords = ["jobs", "vacancies", "careers", "work for us"]
# ---------------

def find_links_google(base_url, keywords, max_results):
    if google_search is None:
        raise ImportError("Google search module not installed. Run: pip install googlesearch-python")
    results = []
    for kw in keywords:
        query = f"site:{base_url} {kw}"
        try:
            hits = google_search(query, num_results=max_results)
            results.extend(hits)
            time.sleep(PAUSE_BETWEEN_QUERIES)
        except Exception as e:
            print(f"[Google] Error: {query} - {e}")
    return list(set(results))

def find_links_duckduckgo(base_url, keywords, max_results):
    if not duckduckgo_search_available:
        raise ImportError("DuckDuckGo module not available")

    results = []
    for kw in keywords:
        query = f"site:{base_url} {kw}"
        try:
            hits = ddg(query, max_results=max_results)
            if hits:
                results.extend([hit["href"] for hit in hits])
            time.sleep(PAUSE_BETWEEN_QUERIES)
        except Exception as e:
            print(f"[DuckDuckGo] Error: {query} - {e}")
    return list(set(results))


# Select engine
def get_links(base_url, keywords, max_results):
    if SEARCH_ENGINE == "google":
        return find_links_google(base_url, keywords, max_results)
    elif SEARCH_ENGINE == "duckduckgo":
        return find_links_duckduckgo(base_url, keywords, max_results)
    else:
        raise ValueError("SEARCH_ENGINE must be 'google' or 'duckduckgo'")

# --- Load and process CSV ---
df = pd.read_csv(INPUT_FILE)

df["url"] = df["url"].str.strip().str.replace("https://", "", regex=False).str.replace("http://", "", regex=False)
df["childrens_services_links"] = ""
df["jobs_links"] = ""

# --- Loop urls ---
for idx, row in df.iterrows():
    base_url = row["url"]
    la_name = row["la_name"]

    print(f"[{idx+1}/{len(df)}] {la_name} ({base_url}) using {SEARCH_ENGINE}")

    try:
        service_links = get_links(base_url, services_keywords, MAX_RESULTS)
        jobs_links = get_links(base_url, jobs_keywords, MAX_RESULTS)

        df.at[idx, "childrens_services_links"] = "; ".join(service_links)
        df.at[idx, "jobs_links"] = "; ".join(jobs_links)
    except Exception as e:
        print(f"Failed for {la_name}: {e}")

# --- Save ---
df.to_csv(OUTPUT_FILE, index=False)
print(f"\nDone. Output saved to: {OUTPUT_FILE}")
