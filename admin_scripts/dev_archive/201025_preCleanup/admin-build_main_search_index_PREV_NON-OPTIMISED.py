# scripts/build_search_index.py
import json
import re
import os
from pathlib import Path
import yaml
import pdfplumber
from bs4 import BeautifulSoup
from sklearn.feature_extraction.text import TfidfVectorizer

import nltk
from nltk.corpus import stopwords

# needed nltk resources
nltk.download('punkt', quiet=True, force=True)
nltk.download('stopwords', quiet=True, force=True)

try:
    import ujson as json
except ImportError:
    import json

# suppress pdf formatting errors
import warnings
import logging
warnings.filterwarnings("ignore")
logging.getLogger("pdfminer").setLevel(logging.ERROR)


# extended stopwords with (domain-specific) exclusions
ADDITIONAL_STOPWORDS = {
    # add to this as further observed irrelevant terms/noise noted
    "maintained", "combines", "authorities", "insight", "childrens", "children",
    "services", "initially", "support", "effectiveness", "whether", "remain", "put",
    "problems", "different", "information", "good", "bad", "bring", "manage", "keep",
    "made", "whole", "way", "best", "use","used","using", "whose","within","also", "another", "either","end"
}
STOPWORDS = set(stopwords.words('english')).union(ADDITIONAL_STOPWORDS)

MAX_WORDS = 1000
KEYWORD_COUNT = 30


def clean_text(text):
    text = text.lower()
    text = re.sub(r'<.*?>', '', text)           # Remove HTML tags
    text = re.sub(r'http[s]?://\S+', '', text)  # Remove URLs
    text = re.sub(r'[^\w\s_-]', '', text)       # Remove special chars
    text = re.sub(r'\s+', ' ', text)            # Normalise whitespace
    return text.strip()


def extract_keywords(text, max_keywords=KEYWORD_COUNT):
    try:
        vectorizer = TfidfVectorizer(
            stop_words=list(STOPWORDS),         # expects a list of strings (or a str or None)
            max_features=max_keywords,
            ngram_range=(1, 2)                  # Unigrams and bigrams (e.g. “child”, “child safety”)
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
            "path": str(yaml_path),
            "source_note": f"YAML file: {yaml_path.name}"
        }

        # Combine fields for text
        combined_text = f"{output['title']} {output['description']} {' '.join(output['tags'])}"
        cleaned = clean_text(combined_text)

        tokens = cleaned.split()
        keywords = [k.lower() for k in extract_keywords(cleaned)]
        match_count = sum(tokens.count(k) for k in keywords if k)
        keyword_density = round(match_count / len(tokens), 4) if tokens else 0.0

        output["text"] = " ".join(tokens[:MAX_WORDS])
        output["keywords"] = keywords
        output["match_count"] = match_count
        output["keyword_density"] = keyword_density

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

def calculate_keyword_metrics(text, keywords):
    words = text.split()
    hits = [word for word in words if word in keywords]
    match_count = len(set(hits))
    keyword_density = round(match_count / len(words), 4) if words else 0.0
    return match_count, keyword_density


def build_index():
    index = []

    # ./data_repos/
    for path in Path("data_repos").rglob("*"):
        if path.suffix.lower() in [".md", ".pdf", ".html", ".js", ".py", ".txt", ".yml", ".yaml"]:
            raw_text = extract_text_from_file(path)
            if raw_text:
                cleaned = clean_text(raw_text)
                try:
                    tool_folder = path.parts[path.parts.index("data_repos") + 1]
                    title = f"{tool_folder} {path.stem}"
                except ValueError:
                    title = path.stem

                keywords = [k.lower() for k in extract_keywords(cleaned)]
                tokens = cleaned.split()
                match_count = sum(tokens.count(k) for k in keywords if k)
                keyword_density = round(match_count / len(tokens), 4) if tokens else 0.0

                index.append({
                    "title": title,
                    "description": "",  # no semantic summary
                    "source_note": f"Extracted from {path.name}",
                    "tags": ["repo"],
                    "path": str(path),
                    "text": " ".join(tokens[:MAX_WORDS]),
                    "keywords": keywords,
                    "match_count": match_count,
                    "keyword_density": keyword_density
                })

    # ./data_yml/
    for ext in ("*.yaml", "*.yml"):
        for path in Path("data_yml").rglob(ext):
            record = extract_yaml_content(path)
            if record:
                try:
                    tool_folder = path.parts[path.parts.index("data_yml") + 1]
                    record["title"] = f"{tool_folder} {record['title']}"
                except ValueError:
                    pass
                if "yml" not in record.get("tags", []):
                    record["tags"].append("yml")

                cleaned = clean_text(record["text"])
                record["source_note"] = f"YAML file: {path.name}"

                keywords = [k.lower() for k in record.get("keywords", [])]
                tokens = cleaned.split()
                match_count = sum(tokens.count(k) for k in keywords if k)
                keyword_density = round(match_count / len(tokens), 4) if tokens else 0.0

                record["keywords"] = keywords
                record["match_count"] = match_count
                record["keyword_density"] = keyword_density

                index.append(record)

    # ./data_published/
    for path in Path("data_published").rglob("*"):
        if path.suffix.lower() in [".md", ".pdf", ".html", ".js", ".py", ".txt"]:
            raw_text = extract_text_from_file(path)
            if raw_text:
                cleaned = clean_text(raw_text)
                try:
                    tool_folder = path.parts[path.parts.index("data_published") + 1]
                    title = f"{tool_folder} {path.stem}"
                except ValueError:
                    title = path.stem

                keywords = [k.lower() for k in extract_keywords(cleaned)]
                tokens = cleaned.split()
                match_count = sum(tokens.count(k) for k in keywords if k)
                keyword_density = round(match_count / len(tokens), 4) if tokens else 0.0

                index.append({
                    "title": title,
                    "description": "",  # no semantic summary
                    "source_note": f"Extracted from {path.name}",
                    "tags": ["published"],
                    "path": str(path),
                    "text": " ".join(tokens[:MAX_WORDS]),
                    "keywords": keywords,
                    "match_count": match_count,
                    "keyword_density": keyword_density
                })

    # ./data_web/
    for path in Path("data_web").rglob("*"):
        if path.suffix.lower() in [".txt", ".html", ".md"]:
            try:
                raw_text = extract_text_from_file(path)
                if not raw_text:
                    continue

                lines = raw_text.splitlines()
                title, source_note, tags, content_lines = "", "", [], []
                mode = "meta"

                for line in lines:
                    line = line.strip()
                    if mode == "meta":
                        if line.startswith("# "):
                            title = line.replace("#", "").replace("Resource", "").strip()
                        elif line.lower().startswith("source:"):
                            source_note = line[7:].strip()
                        elif line.lower().startswith("tags:"):
                            tags = [t.strip().lower() for t in line[5:].split(",")]
                        elif line.strip() == "---":
                            mode = "body"
                    elif mode == "body":
                        content_lines.append(line)

                if not title or not source_note:
                    print(f"Missing required fields in: {path.name}")
                    continue

                content = "\n".join(content_lines).strip()
                cleaned = clean_text(content)
                tokens = cleaned.split()
                keywords = [k.lower() for k in extract_keywords(cleaned)]
                match_count = sum(tokens.count(k) for k in keywords if k)
                keyword_density = round(match_count / len(tokens), 4) if tokens else 0.0

                index.append({
                    "title": title,
                    "description": "",
                    "source_note": source_note,
                    "tags": tags + ["web"],
                    "path": str(path),
                    "text": " ".join(tokens[:MAX_WORDS]),
                    "keywords": keywords,
                    "match_count": match_count,
                    "keyword_density": keyword_density
                })

            except Exception as e:
                print(f"Error processing {path.name}: {e}")


    # put generated search index file into mkdocs data folder
    output_path = os.path.join(os.path.dirname(__file__), "..", "docs", "data", "search_index.json")

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(index, f, indent=2, ensure_ascii=False)

    print(f"Built search index with {len(index)} entries at {output_path}")






if __name__ == "__main__":
    build_index()
