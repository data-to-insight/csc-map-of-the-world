
# Reusing -Map of the World- corpus locally
_A short guide for local authority colleagues_

Explains how you can start from the shared corpus and **add your own documents** without rebuilding everything. It also lists the files the (pre-processing)Jupyter notebook creates and where they live when running locally.

---

## What LAs/data colleagues can do

- **Start from the shared corpus** - and add your own PDFs, Word documents, or text files  
- **Append only what is new** - Unchanged documents are skipped automatically  
- **Keep storage small** - we store compact Parquet tables and a FAISS index, not the original PDFs  
- **Reuse the corpus** - in your own analysis tools. Parquet and FAISS are standard, portable formats

---

## What is in the shared pack

Place these in your project folder:

```
csc_artifacts/
  state.json                 # records which documents were processed and with which settings
  chunks/                    # per-document Parquet of chunked text + metadata
  vectors/                   # per-document Parquet of vectors (uint8 by default)
  motw_index.faiss           # FAISS index (HNSW) built over all vectors
# optional
  motw_chunks.parquet        # combined text+meta (only if materialised)
  motw_vectors.parquet       # combined text+vectors (only if materialised)
```

You provide your own documents into:

```
data_published/              # put your PDFs, .docx, or .txt here
```

> We avoid storing the PDFs in Git (inconsistent formatting and heavier file sizes). Keep them local or in object storage if you need an archive.

---

## What the notebook creates

When you run the notebook, it will create or update:

- `csc_artifacts/state.json` - manifest with hashes, sizes, chunk counts, and build settings  
- `csc_artifacts/chunks/<doc_id>.parquet` - chunked text and metadata for each document  
- `csc_artifacts/vectors/<doc_id>.parquet` - the matching vectors for each document. Stored as `embedding_q` (uint8) + note on how to dequantise  
- `csc_artifacts/motw_index.faiss` - the FAISS search index  
- Optionally, `csc_artifacts/motw_chunks.parquet` and `csc_artifacts/motw_vectors.parquet` if you turn on materialisation

Each document is identified by the first 16 hex chars of its SHA-256 hash. This keeps the build **incremental** and avoids duplicates.

---

## Two main ways to run

### 1.Fresh build
Use when you are starting from scratch or want a clean rebuild.

- The notebook scans `data_published/`, extracts text, chunks it, embeds it, writes per-document Parquet, and builds a fresh FAISS index.  
- It writes a new `state.json` so the next/future runs are incremental

### 2.Append your new files
Use when you are starting from the shared pack and want to add your own documents.

- Put your documents into `data_published/`  
- The notebook compares hashes against `state.json`. Unchanged documents are skipped  
- New documents are processed and **appended** to the existing FAISS index  
- If any existing document has changed, the notebook **rebuilds the index** from the per-document Parquet to keep it correct

---

## Other options

- **Rebuild from Parquet only** - if you have the per-document Parquet but no FAISS file, the notebook can rebuild the index without touching PDFs  
- **Materialise a single-file Parquet** - if you prefer a single file, turn on materialisation to write `motw_chunks.parquet` and `motw_vectors.parquet`. This is optional because the per-document layout already supports incremental updates  
- **Upload to object storage** - if you set the Cloudflare R2 variables, the notebook can upload updated artefacts after a run

---

## Changes and deletions

- **Changed documents** - if the content of a document changes, its hash changes. The notebook reprocesses that document and **rebuilds** the FAISS index so your search stays correct  
- **Deleted documents** - remove the matching files in `csc_artifacts/chunks/` and `csc_artifacts/vectors/` and delete the entry in `state.json`, then run the notebook to rebuild the FAISS index

---

## Did it work? 

You should see a summary like:

```
Docs: 120  Read errors: 0  Empty: 0
Chars: 14,200,000  Chunks: 95,400
[Embedding] 00:02:15s
Write/Update FAISS...
rows (meta, vectors, index): 95,400, 95,400, 95,400
Done.
```

- The counts for **meta**, **vectors**, and the FAISS **index** should match  
- If you only added new files, you should see a note about **appending** to the index rather than rebuilding

---

## Why this might enable your LA's data work

- **Standard formats** - Parquet can be read by Pandas, Polars, DuckDB, Spark and more. FAISS is a common vector index  
- **Local-first** - you can work entirely on your machine. No need to upload PDFs  
- **Incremental by design** - starting from the shared pack means you only build what is new, then carry on where we left off
