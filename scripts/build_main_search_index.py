# scripts/build_search_index.py
import json
import re
from pathlib import Path
import yaml
import pdfplumber
from bs4 import BeautifulSoup
from sklearn.feature_extraction.text import TfidfVectorizer

import nltk
from nltk.corpus import stopwords

# Ensure required resources are available
nltk.download('punkt', quiet=True, force=True)
nltk.download('stopwords', quiet=True, force=True)

try:
    import ujson as json
except ImportError:
    import json

# Extend default stopwords with domain-specific exclusions
ADDITIONAL_STOPWORDS = {
    "maintained", "combines", "authorities", "insight", "childrens", "children",
    "services", "initially", "support", "effectiveness", "whether", "remain", "put",
    "problems", "different", "information", "good", "bad", "bring", "manage", "keep",
    "made", "whole", "way", "best", "use","used","using", "whose","within","also", "another", "either","end"
}
STOPWORDS = set(stopwords.words('english')).union(ADDITIONAL_STOPWORDS)

MAX_WORDS = 200
KEYWORD_COUNT = 150


def clean_text(text):
    text = text.lower()
    text = re.sub(r'<.*?>', '', text)  # Remove HTML tags
    text = re.sub(r'http[s]?://\S+', '', text)  # Remove URLs
    text = re.sub(r'[^\w\s_-]', '', text)  # Remove special chars
    text = re.sub(r'\s+', ' ', text)  # Normalize whitespace
    return text.strip()


def extract_keywords(text, max_keywords=KEYWORD_COUNT):
    try:
        vectorizer = TfidfVectorizer(
            stop_words=list(STOPWORDS), # expects a list of strings (or a str or None)
            max_features=max_keywords,
            ngram_range=(1, 2) # Unigrams and bigrams (e.g. “child”, “child safety”)
        )
        tfidf_matrix = vectorizer.fit_transform([text])
        keywords = vectorizer.get_feature_names_out()
        return list(keywords)
    except Exception as e:
        print(f"TF-IDF error: {e}")
        return []


def extract_yaml_content(yaml_path):
    if yaml_path.name.startswith("0_template") or yaml_path.name.startswith("_template"):
        return None
    try:
        with open(yaml_path, 'r', encoding='utf-8') as f:
            content = yaml.safe_load(f)
        if not isinstance(content, dict):
            return None
        output = {
            "title": content.get("name", yaml_path.stem),
            "description": content.get("description", ""),
            "tags": content.get("tags", []),
            "path": str(yaml_path)
        }
        combined_text = f"{output['title']} {output['description']} {' '.join(output['tags'])}"
        clean = clean_text(combined_text)
        output["text"] = " ".join(clean.split()[:MAX_WORDS])
        output["keywords"] = extract_keywords(clean)
        return output
    except Exception as e:
        print(f"Error reading {yaml_path}: {e}")
        return None


def extract_text_from_file(path):
    try:
        if path.suffix == ".pdf":
            text = ""
            with pdfplumber.open(path) as pdf:
                for page in pdf.pages:
                    text += page.extract_text() or ""
            return text

        elif path.suffix in [".html", ".js"]:
            with open(path, 'r', encoding='utf-8') as f:
                soup = BeautifulSoup(f, 'html.parser')
                return soup.get_text()

        elif path.suffix in [".md", ".py", ".txt"]:
            with open(path, 'r', encoding='utf-8') as f:
                return f.read()

    except Exception as e:
        print(f"Error reading {path}: {e}")
    return ""


def build_index():
    index = []

    # YAML/YML files from data_yml only
    for ext in ("*.yaml", "*.yml"):
        for path in Path("data_yml").rglob(ext):
            record = extract_yaml_content(path)
            if record:
                index.append(record)

    # Other file types from data_published
    for path in Path("data_published").rglob("*"):
        if path.suffix.lower() in [".md", ".pdf", ".html", ".js", ".py", ".txt"]:
            raw_text = extract_text_from_file(path)
            if raw_text:
                cleaned = clean_text(raw_text)
                index.append({
                    "title": path.stem,
                    "description": f"Extracted from {path.name}",
                    "tags": [],
                    "path": str(path),
                    "text": " ".join(cleaned.split()[:MAX_WORDS]),
                    "keywords": extract_keywords(cleaned)
                })

    with open("search_index.json", "w", encoding="utf-8") as f:
        json.dump(index, f, indent=2, ensure_ascii=False)
    print(f"Built search index with {len(index)} entries.")


if __name__ == "__main__":
    build_index()
