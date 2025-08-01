from pathlib import Path
import pdfplumber
from hashlib import sha256
from sklearn.feature_extraction.text import CountVectorizer

import contextlib
import io


from utils.text_utils import clean_text, extract_summary, lemmatise_filtered_words



def process_pdf_file(path):
    try:
        with contextlib.redirect_stderr(io.StringIO()):  # Suppress PDF warnings
            with pdfplumber.open(path) as pdf:
                raw_text = "\n".join([p.extract_text() or "" for p in pdf.pages])
    except Exception as e:
        print(f"Skipping {path.name}: {e}")
        return None

    cleaned_text = clean_text(raw_text)
    lemmatised = lemmatise_filtered_words(cleaned_text)
    keyword_text = " ".join(lemmatised)

    try:
        folder = path.parts[path.parts.index("data_published") + 1]
        title = f"{folder} {path.stem}".replace("_", " ").title()
    except ValueError:
        title = path.stem.replace("_", " ").title()

    return {
        "doc_id": sha256(path.name.encode()).hexdigest()[:12],
        "name": title,
        "excerpt": extract_summary(cleaned_text),
        "tags": ["published"],
        "url": "",
        "keywords": keyword_text,
        "file": path.name
    }



def load_from_data_published():
    published_dir = Path("data_published")
    entries, texts = [], []

    for path in published_dir.rglob("*.pdf"):
        record = process_pdf_file(path)
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
