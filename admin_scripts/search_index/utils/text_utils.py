import re
from nltk.stem import WordNetLemmatizer
from nltk.corpus import stopwords

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

def lemmatise_filtered_words(text):
    words = re.findall(r'\b[a-zA-Z]{4,}\b', text.lower())
    return [lemmatizer.lemmatize(w) for w in words if w not in stop_words]
