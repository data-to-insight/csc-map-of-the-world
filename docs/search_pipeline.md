## Full-Text Search Strategy (Optimised for Static Hosting)

To support **search across the contents of hundreds of documents and varied sources** (including PDFs) within our [MkDocs-based site](https://www.mkdocs.org/), we needed an approach that simulates **full-text search** while remaining **scalable, performant, and static-host compatible** (i.e. no backend/db).

### Main Goals

- Allow users to **search document content** (not just titles)
- Ensure performance remains fast even as **hundreds of documents are added**
- Avoid full-text duplication or payload bloat in both the frontend and backend(to avoid hitting Git limits)
- Keep compatibility with static site hosting (e.g. GitHub Pages, `list.js`, `lunr.js`, Mkdocs)

---

### Optimisation Strategy

Rather than store the entire text of every PDF in the search index (which would be slow and bloated), we take the following approach:

1. **Extract Text from PDFs**  
   - Using `pdfplumber`, each document’s text is extracted and cleaned
   - Unicode characters like curly quotes, dashes, ellipses are normalised for consistency

2. **Generate Excerpts**  
   - A short `excerpt` is created from the first meaningful paragraph (ignoring TOCs and headings)
   - This is used in search results and graph visualisation tooltips

3. **Lemmatise and Tokenise Keywords**  
   - Words are lemmatised (e.g. *running*, *ran*, *runs* → *run*) using `nltk`
   - Common English stopwords are removed
   - This creates a **compressed keyword representation** of each document

4. **Apply Document Frequency Filtering**  
   - Using `CountVectorizer` from `scikit-learn`, we:
     - Remove overly common terms (appear in >85% of docs)
     - Remove rare noise terms (appear in <2 docs)
   - This results in **signal-rich keywords** per document

5. **Final Search Index Generation**  
   - Each optimised document (content) is represented in `docs/search_index.json` with:
     - `doc_id`, `name`, `excerpt`, `url`, `tags`, and optimised `keywords`
   - At runtime, search results display:
     - Matched titles
     - Decoded excerpts
     - A prioritised and randomly sampled **subset of keywords** (max 20) to avoid repetition or alphabetical bias

---

### Optional Archive (Parquet)

For potential archival or later ML processing is needed, a full `.parquet` file can also be saved  (`admin_scripts/docs_index.parquet`) with complete text and metadata (disabled by default to keep project lightweight, but a variable flag can bve set in the py index build script).

---

### Key Libraries Used

| Purpose                   | Tool                                  |
|---------------------------|----------------------------------------|
| PDF text extraction       | `pdfplumber`                           |
| Text cleanup              | `re`, `unicodedata`, `DOMParser` (JS) |
| Lemmatisation & stopwords | `nltk`                                 |
| Frequency filtering       | `scikit-learn` (`CountVectorizer`)     |
| Output formats            | `json`, `pandas`, `parquet`            |

---

This setup we think ensures **search is (acceptably)fast, useful, and scalable** — and that the project can grow without sacrificing performance or frontend simplicity. We're in the process of scaling this up for more complete/realistic testing alongside a cyclic review approach. 