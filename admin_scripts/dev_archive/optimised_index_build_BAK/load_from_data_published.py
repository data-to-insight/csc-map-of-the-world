from pathlib import Path
import pdfplumber
import re
from hashlib import sha256
from nltk.stem import WordNetLemmatizer
from nltk.corpus import stopwords
from sklearn.feature_extraction.text import CountVectorizer

# Re-init NLP tools
lemmatizer = WordNetLemmatizer()
stop_words = set(stopwords.words("english"))

# Text utils
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

# Extract text from a single PDF
def process_pdf_file(path):
    try:
        with pdfplumber.open(path) as pdf:
            raw_text = "\n".join([p.extract_text() or "" for p in pdf.pages])
    except Exception as e:
        print(f"Skipping {path.name}: {e}")
        return None

    cleaned_text = clean_text(raw_text)
    words = re.findall(r'\b[a-zA-Z]{4,}\b', cleaned_text.lower())
    lemmatised = [lemmatizer.lemmatize(w) for w in words if w not in stop_words]
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

# Main loader
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

# Preview
load_from_data_published()[:2]
