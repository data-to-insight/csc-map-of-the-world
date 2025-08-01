from pathlib import Path
import yaml
import re
from hashlib import sha256
from nltk.stem import WordNetLemmatizer
from nltk.corpus import stopwords
from sklearn.feature_extraction.text import CountVectorizer

# Re-initialise required tools
lemmatizer = WordNetLemmatizer()
stop_words = set(stopwords.words("english"))

# Helper functions reused from previous block
def normalise_unicode(text):
    replacements = {
        "\u2018": "'", "\u2019": "'",
        "\u201C": '"', "\u201D": '"',
        "\u2013": "-", "\u2014": "-",
        "\u2026": "...", "\u2022": "-",
        "•": "-"
    }
    for bad, good in replacements.items():
        text = text.replace(bad, good)
    return text

def clean_text(text):
    text = normalise_unicode(text)
    text = re.sub(r"\s+", " ", text)
    text = re.sub(r'(page\s+\d+|contents\s+page)', '', text, flags=re.IGNORECASE)
    text = re.sub(r"[^a-zA-Z0-9\s\.,;:‘’'\"-]", "", text)
    return text.strip()

def extract_summary(text, max_chars=300):
    paragraphs = [p.strip() for p in text.split("\n") if len(p.strip()) > 40]
    for p in paragraphs:
        if not re.search(r"(contents|page\s+\d+|section\s+\d+)", p, re.IGNORECASE):
            return p[:max_chars] + "..."
    return paragraphs[0][:max_chars] + "..." if paragraphs else ""

# Process a single YAML file
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
        words = re.findall(r'\b[a-zA-Z]{4,}\b', cleaned_text.lower())
        lemmatised = [lemmatizer.lemmatize(w) for w in words if w not in stop_words]
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

# Main loader function for data_yml
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

# PReview
load_from_data_yml()[:2]
