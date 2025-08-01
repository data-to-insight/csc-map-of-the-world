from pathlib import Path
import re
from hashlib import sha256
from nltk.stem import WordNetLemmatizer
from nltk.corpus import stopwords
from sklearn.feature_extraction.text import CountVectorizer

lemmatizer = WordNetLemmatizer()
stop_words = set(stopwords.words("english"))

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
    text = re.sub(r"(page\s+\d+|contents\s+page)", "", text, flags=re.IGNORECASE)
    text = re.sub(r"[^a-zA-Z0-9\s\.,;:‘’'\"-]", "", text)
    return text.strip()

def extract_summary(text, max_chars=300):
    paragraphs = [p.strip() for p in text.split("\n") if len(p.strip()) > 40]
    for p in paragraphs:
        if not re.search(r"(contents|page\s+\d+|section\s+\d+)", p, re.IGNORECASE):
            return p[:max_chars] + "..."
    return paragraphs[0][:max_chars] + "..." if paragraphs else ""

def process_data_web_file(path):
    try:
        with open(path, 'r', encoding='utf-8') as f:
            lines = f.readlines()

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
            print(f"Skipping {path.name}: missing title or source")
            return None

        raw_text = "\n".join(content_lines).strip()
        cleaned_text = clean_text(raw_text)
        words = re.findall(r'\b[a-zA-Z]{4,}\b', cleaned_text.lower())
        lemmatised = [lemmatizer.lemmatize(w) for w in words if w not in stop_words]
        keyword_text = " ".join(lemmatised)

        return {
            "doc_id": sha256(path.name.encode()).hexdigest()[:12],
            "name": title,
            "excerpt": extract_summary(cleaned_text),
            "tags": tags + ["web"],
            "url": source_note,
            "keywords": keyword_text,
            "file": path.name
        }

    except Exception as e:
        print(f"Error processing {path.name}: {e}")
        return None

def load_from_data_web():
    entries, texts = [], []
    for path in Path("data_web").rglob("*"):
        if path.suffix.lower() in [".txt", ".md"]:
            record = process_data_web_file(path)
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
