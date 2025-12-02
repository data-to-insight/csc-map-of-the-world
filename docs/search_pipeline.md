## Full-Text Search Strategy (Optimised for Static Hosting)

To support **search across the contents of thousands of documents and varied sources** (including PDFs) within our [MkDocs-based site](https://www.mkdocs.org/), we're exploring approaches that can simulate **full-text search** while remaining **scalable, performant, and static-host compatible** (i.e. no backend/db, fully Git contained).

### Main Goals

- Allow users to **search document content** (not just titles)
- Ensure performance remains fast even as **thousands of documents/sources added**
- Avoid full-text duplication or payload bloat in both frontend and backend(to avoid hitting Git/responsiveness limits)
- Keep compatibility with static site hosting (e.g. GitHub Pages, `list.js`, `lunr.js`, Mkdocs)

---

### Optimisation Strategy

Rather than store the entire text of every PDF in the search index (slower and rapidly bloated), we're exploring approaches based around:

1. **Extract Text from PDFs**  
   - Using `pdfplumber`, each document’s text extracted and cleaned
   - Unicode characters like curly quotes, dashes, ellipses are normalised for consistency

2. **Generate Excerpts**  
   - Shorter `excerpt`s are created from (near)first meaningful paragraph (trying to ignore TOCs and headings)
   - This then contributes to search results and graph visualisation tooltips

3. **Lemmatise and Tokenise Keywords**  
   - Words are lemmatised (e.g. *running*, *ran*, *runs* → *run*) using `nltk`
   - Thus creating/aiming for a usable **compressed keyword representation** of each document

4. **Apply Document Frequency Filtering**  
   - Use `CountVectorizer` from `scikit-learn`:
     - Remove overly common terms (in progress but approximately: appear in >85% of docs)
     - Remove rare noise terms (appear in <2 docs)
   - This results in **signal-rich keywords** per document

5. **Final Search Index Generation**  
   - Each optimised document (content) is then represented in `docs/search_index.json` with:
     - `doc_id`, `name`, `excerpt`, `url`, `tags`, and optimised `keywords`
   - At runtime, search results display:
     - Matched titles
     - Decoded excerpts
     - A prioritised and randomly sampled **subset of keywords** (max 20) to avoid repetition or alphabetical bias

Note: Ongoing work towards the above is a core, under-pinning part of the D2I backend work towards an efficient CSC Map.
---

### Optional Archive (Parquet)

For potential archival or later ML processing if needed, a full `.parquet` file is made available  (`admin_scripts/docs_index.parquet`) with complete text and metadata (disabled by default to keep project lightweight during development, but a variable flag can bve set in the py index build script to generate this for interested LA colleagues who might be able to further use it).

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