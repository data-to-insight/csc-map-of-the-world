import re
import os
import json
import pdfplumber
import pandas as pd
from pathlib import Path
from hashlib import sha256
from nltk.corpus import stopwords
from nltk.stem import WordNetLemmatizer
from sklearn.feature_extraction.text import CountVectorizer
import nltk

# CONFIG
SAVE_PARQUET = False # not used within mkdocs search, only internal proc

# File paths
pdf_dir = Path("data_published")
output_json_path = Path("docs/search_index.json")
output_parquet_path = Path("admin_scripts/docs_index.parquet")

# NLTK resources
nltk.download("stopwords")
nltk.download("wordnet")


# Unicode normalisation

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


# Cleaning & summary

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


# NLP + keyword extraction

lemmatizer = WordNetLemmatizer()
stop_words = set(stopwords.words("english"))

docs, texts, summaries = [], [], []
for pdf_file in pdf_dir.glob("*.pdf"):
    try:
        with pdfplumber.open(pdf_file) as pdf:
            raw_text = "\n".join([p.extract_text() or "" for p in pdf.pages])
    except Exception as e:
        print(f"Skipping {pdf_file.name}: {e}")
        continue

    cleaned_text = clean_text(raw_text)
    summary = extract_summary(cleaned_text)

    words = re.findall(r'\b[a-zA-Z]{4,}\b', cleaned_text.lower())
    lemmatised = [lemmatizer.lemmatize(w) for w in words if w not in stop_words]
    texts.append(" ".join(lemmatised))

    docs.append({
        "doc_id": sha256(pdf_file.name.encode()).hexdigest()[:12],
        "name": pdf_file.stem.replace("_", " ").title(),
        "text": cleaned_text,
        "excerpt": summary,
        "tags": [],
        "url": "",
        "file": pdf_file.name
    })
    summaries.append(summary)


# Frequency filtering

vectorizer = CountVectorizer(max_df=0.85, min_df=2) # if appearing in % of docs, filter as too common
X = vectorizer.fit_transform(texts)
features = vectorizer.get_feature_names_out()


# Build and save

search_index = []
for i, doc in enumerate(docs):
    keywords = [features[j] for j in X[i].nonzero()[1]]
    search_index.append({
        "doc_id": doc["doc_id"],
        "name": doc["name"],
        "excerpt": summaries[i],
        "tags": doc.get("tags", []),
        "url": doc.get("url", ""),
        "keywords": sorted(keywords)
    })

# index must be into mkdocs build folder
with open(output_json_path, "w", encoding="utf-8") as f:
    json.dump(search_index, f, indent=2)

# Parquet archive if option flag true
if SAVE_PARQUET:
    df = pd.DataFrame(docs)
    df.to_parquet(output_parquet_path, index=False)

# ref output file size (review/remove after up scaling)
def size_mb(path): return round(os.path.getsize(path) / 1024**2, 2)

print(f"Saved: {output_json_path} ({size_mb(output_json_path)} MB)")
if SAVE_PARQUET:
    print(f"Saved: {output_parquet_path} ({size_mb(output_parquet_path)} MB)")
