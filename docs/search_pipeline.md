## Full-Text Search Strategy (Optimised for Static Hosting)

To support **search across the contents of hundreds of documents** (including PDFs) within our [MkDocs-based site](https://www.mkdocs.org/), we needed an approach that simulates **full-text search** while remaining **scalable, performant, and static-host compatible** (i.e. no backend).

### Goals

- Allow users to **search document content** (not just titles)
- Ensure performance remains fast even as **hundreds of documents are added**
- Avoid full-text duplication or payload bloat in the frontend
- Keep compatibility with static site hosting (e.g. GitHub Pages, `lunr.js`, `list.js`)

---

### Optimisation Strategy

Rather than store the entire text of every PDF in the search index (which would be slow and bloated), we take the following approach:

1. **Extract Text from PDFs**  
   - Using `pdfplumber`, each document’s text is extracted and cleaned.
   - Curly quotes, dashes, ellipses, and other Unicode artifacts are normalised for consistency.

2. **Generate Smart Summaries**  
   - A short summary is created from the first meaningful paragraph (ignoring TOCs and headings).
   - This is displayed in search results and graph visualisations.

3. **Lemmatise and Tokenise Keywords**  
   - Words are lemmatised (e.g. *running*, *ran*, *runs* → *run*) using `nltk`.
   - Common English stopwords (e.g. *the*, *with*, *from*) are removed.
   - This creates a **compressed keyword representation** of each document.

4. **Apply Document Frequency Filtering**  
   - Using `CountVectorizer` from `scikit-learn`, we:
     - Remove overly common terms (appear in >85% of docs)
     - Remove rare noise terms (appear in <2 docs)
   - This ensures only **signal-rich terms** are stored per document.

5. **Generate Optimised JSON Index**  
   - Final output is written to `docs/search_index.json` (used by frontend search).
   - Each record includes:
     - `doc_id`, `name`, `summary`, `url`, `keywords`, `tags`

---

### Optional Archive (Parquet)

If archival or later ML processing is needed, a full `.parquet` file can also be saved (`admin_scripts/docs_index.parquet`) with complete text and metadata. This is optional and disabled by default to keep the project lightweight.

---

### Key Libraries Used

| Purpose                 | Tool                         |
|--------------------------|------------------------------|
| PDF text extraction      | `pdfplumber`                 |
| Text cleanup             | `re`, Unicode normalisation  |
| Lemmatisation & stopwords| `nltk`                       |
| Frequency-based filtering| `scikit-learn` (`CountVectorizer`) |
| Output formats           | `json`, `pandas`, `parquet`  |

---

This setup ensures **search is fast, useful, and scalable** — and that the project can grow without sacrificing performance or frontend simplicity.

Let us know if you’d like a CLI interface or GitHub Action to run this pipeline automatically on new uploads.

