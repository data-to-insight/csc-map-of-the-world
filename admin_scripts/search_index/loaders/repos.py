from pathlib import Path
from hashlib import sha256
from sklearn.feature_extraction.text import CountVectorizer
import subprocess
import shutil
import os

from utils.text_utils import clean_text, extract_summary, lemmatise_filtered_words

# Mapping of short folder name to GitHub repo URL
REPO_REMOTE_URLS = {
    "ilacs_scrape": "https://github.com/data-to-insight/ofsted-ilacs-scrape-tool",
    "send_scrape": "https://github.com/data-to-insight/ofsted-send-scrape-tool",
    "jtai_scrape": "https://github.com/data-to-insight/ofsted-jtai-scrape-tool",
    "foi_scrape": "https://github.com/data-to-insight/foi-csc-scrape-tool",
    "youthjustice_scrape": "https://github.com/data-to-insight/hmi-probation-youth-justice-scrape",
    "send": "https://github.com/data-to-insight/SEND-tool",
    "patch": "https://github.com/data-to-insight/patch",
    "nvest": "https://github.com/data-to-insight/nvest",
    "validator_903": "https://github.com/data-to-insight/csc-validator-be-903",
    "validator_sen": "https://github.com/data-to-insight/annex-a-sen-validator-be",
    "validator_cin": "https://github.com/data-to-insight/csc-validator-be-cin",
    "demand_model": "https://github.com/data-to-insight/cs-demand-model",
    "d2i_contacts_processing": "https://github.com/data-to-insight/d2i-contacts",
    "d2i_linux_img": "https://github.com/data-to-insight/d2i-linux-build"
}

FILES_TO_FETCH = ["README.md"]
CLONE_DIR = Path("data_repos")

def sparse_checkout_repo(repo_url: str, local_path: Path, sparse_paths: list[str], force_refresh=False):
    try:
        if local_path.exists():
            if force_refresh:
                shutil.rmtree(local_path)
            else:
                return True  # skip existing clone

        subprocess.run([
            "git", "clone", "--filter=blob:none", "--sparse", repo_url, str(local_path)
        ], check=True)

        subprocess.run(["git", "sparse-checkout", "init", "--no-cone"], cwd=local_path, check=True)
        subprocess.run(["git", "sparse-checkout", "set", *sparse_paths], cwd=local_path, check=True)

        return True
    except subprocess.CalledProcessError as e:
        print(f"Failed to clone {repo_url}: {e}")
        return False

def fetch_all_repo_files(force_refresh=False):
    CLONE_DIR.mkdir(parents=True, exist_ok=True)
    for short_name, url in REPO_REMOTE_URLS.items():
        repo_name = url.rstrip("/").split("/")[-1]
        local_path = CLONE_DIR / repo_name
        success = sparse_checkout_repo(url, local_path, FILES_TO_FETCH, force_refresh=force_refresh)

        if not success:
            continue

        for file in FILES_TO_FETCH:
            full_path = local_path / file
            if not full_path.exists():
                print(f"File not found: {file} in {short_name}")

def read_text_from_file(path):
    try:
        return path.read_text(encoding='utf-8')
    except Exception as e:
        print(f"Error reading {path.name}: {e}")
        return ""

def process_repo_file(path, repo_url):
    raw_text = read_text_from_file(path)
    if not raw_text:
        return None

    cleaned_text = clean_text(raw_text)
    lemmatised = lemmatise_filtered_words(cleaned_text)
    keyword_text = " ".join(lemmatised)

    try:
        tool_folder = path.parts[path.parts.index("data_repos") + 1]
        title = f"{tool_folder} {path.stem}".replace("_", " ").title()
    except ValueError:
        title = path.stem.replace("_", " ").title()

    return {
        "doc_id": sha256(path.name.encode()).hexdigest()[:12],
        "name": title,
        "excerpt": extract_summary(cleaned_text),
        "tags": ["repo"],
        "url": repo_url,
        "keywords": keyword_text,
        "file": path.name
    }

def load_from_data_repos(force_refresh=False):
    fetch_all_repo_files(force_refresh=force_refresh)

    entries, texts = [], []

    for short_name, repo_url in REPO_REMOTE_URLS.items():
        repo_folder = repo_url.rstrip("/").split("/")[-1]
        repo_dir = CLONE_DIR / repo_folder
        for path in repo_dir.rglob("*.md"):
            record = process_repo_file(path, repo_url)
            if record:
                texts.append(record["keywords"])
                entries.append(record)

    if not entries:
        return []

    vectorizer = CountVectorizer(max_df=0.85, min_df=2)
    X = vectorizer.fit_transform(texts)
    features = vectorizer.get_feature_names_out()

    search_index = []
    for i, record in enumerate(entries):
        keywords = [features[j] for j in X[i].nonzero()[1]]
        search_index.append({
            "doc_id": record["doc_id"],
            "name": record["name"],
            "excerpt": record["excerpt"],
            "tags": record["tags"],
            "url": record["url"],
            "keywords": sorted(keywords)
        })

    return search_index
