from pathlib import Path
import yaml
from hashlib import sha256
from sklearn.feature_extraction.text import CountVectorizer

from utils.text_utils import clean_text, extract_summary, lemmatise_filtered_words


def process_yaml_file(path):
    try:
        if path.name.startswith("0_") or path.name.startswith("_"):
            return None

        with open(path, 'r', encoding='utf-8') as f:
            content = yaml.safe_load(f)

        if not isinstance(content, dict):
            return None

        title = content.get("name", path.stem)
        desc = content.get("description", "")
        tags = content.get("tags", [])

        raw_text = f"{title} {desc} {' '.join(tags)}"
        cleaned_text = clean_text(raw_text)
        lemmatised = lemmatise_filtered_words(cleaned_text)
        keyword_text = " ".join(lemmatised)

        return {
            "doc_id": sha256(path.name.encode()).hexdigest()[:12],
            "name": title,
            "excerpt": extract_summary(cleaned_text),
            "tags": tags + ["yml"],
            "url": "",
            "keywords": keyword_text,
            "file": path.name
        }

    except Exception as e:
        print(f"Error processing {path.name}: {e}")
        return None


def load_from_data_yml():
    yml_dir = Path("data_yml")
    entries, texts = [], []

    for ext in ("*.yaml", "*.yml"):
        for path in yml_dir.rglob(ext):
            record = process_yaml_file(path)
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
