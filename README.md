# Children's Services Knowledge Base

[![Open Source](https://img.shields.io/badge/Open%20Source-Yes-brightgreen)](https://opensource.org)

# D2I Knowledge Base

[![Codespaces Ready](https://img.shields.io/badge/Codespaces-ready-blue?logo=github)](https://github.com/features/codespaces)
[![Python](https://img.shields.io/badge/Python-3.9%2B-green?logo=python)](https://www.python.org/)
[![NLTK](https://img.shields.io/badge/NLP-NLTK-brightgreen)](https://www.nltk.org/)

A browser-based knowledge-base tool for representing, and searching Children's Social Care related data eco-system. Built using Python/MKDOCS/Javascript/YAML to provide an interface across local documentation and selected GitHub repositories. This tool supports markdown, PDF, HTML, JS, and Python file types and is designed for knowledge management in children's services and data tools developed by [Data to Insight](https://github.com/data-to-insight). 

---

## Features

- 🔍 Text search across `.md`, `.pdf`, `.html`, `.js`, `.py` files
- 📁 Local `/docs` folder for manual document uploads
- 🧠 NLP-based preprocessing and normalisation using NLTK
- 🛠 GitHub repo integration and automated cleanup to conserve memory
- 📌 Results display includes context snippets, hit count and document density

---

An open-source, Git-native 'map of the world' or knowledge base for connected **people**, **projects**, and **organisations** in the **children’s services sector**, aligned to the [Smart City Concept Model/framework (SCCM)](http://www.smartcityconceptmodel.com/).

---

## Notes / Dev story

- How can/should we structure the (meta) data about every element within the map (csv, db, flat file, .yml...)
- Can|should we store the names of people around the various initiatives/projects (is that relevant/useful and would they want that)
- How do we store the data for retrieval, as we scale up with larger volumes what impact will this have (esp on load/search times)
- 

## Structure

 /workspaces/d2i-map-of-the-world-mkdocs (main) $
```
/knowledge_base
├── data/ # source .YML files
│   ├── index_data.parquet  ← cached index lives here
│   └── organizations/...   ← sccm framework folder struct with YML flat files
│   └── relationships/...   ← sccm framework folder struct with YML flat files
│   └── etc... 
├── scripts/
│   ├── # general repo admin scripts
└── README.md
└── setup.sh
└── requirements.txt

```

---

## Dev Notes


I previously considered, Python 3.9+ and the following packages, but have since had to rethink the approach:
```bash
pip install streamlit duckdb pyyaml cerberus
```
---

### Dependencies

Python 3.9+ and the following packages:

# Install MkDocs and theme
```
pip install mkdocs mkdocs-material pyyaml
```
# Build JSON for Cytoscape
```
python scripts/build_cytoscape_json.py
```
# Serve docs locally
```
rm -rf site/
mkdocs build &&  mkdocs serve
mkdocs serve --dev-addr=0.0.0.0:8001 # to get round the OSError: [Errno 98] Address already in use

```



### Validate YAML Structure

Use the built-in schema validation script:

```bash
python scripts/validate_schema.py
```

This checks for required fields and types based on a lightweight SCCM-aligned schema.

### Rebuild Search Index

DuckDB is used as a fast in-memory index:

```bash
python scripts/build_runtime_index.py
```

You’ll see all records loaded and printed to terminal. If you’re running streamlit run app/Home.py you don't need to do this as build_duckdb_index(records) is automatically called — no need to run it separately.

### Text-to-SQL (Prototype)

You can simulate natural language queries:

```bash
python scripts/nlp_to_sql.py
```

Example input:
```
Who worked on safeguarding in the North West?
```

---

## Future Plans

- SCCM-compliant JSON-LD export
- GitHub Pages + search index
- Relationship mapping (RELATIONSHIP, EVENT)
- Collaborative edit + merge workflow

---

© D2I
