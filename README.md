# D2I Knowledge Base

A structured, open-source knowledge base and ecosystem map for the **Children’s Social Care (CSC)** sector. This project brings together documentation, relationships, services, tools, rules, plans, and events, using a flexible YAML-based data model aligned with the [Smart City Concept Model (SCCM)](http://www.smartcityconceptmodel.com/).

It supports full-text search, graph-based visualisation, and schema validation across structured `.yml` records and supporting documents (PDF, Markdown, HTML, Python, JS). Designed to be extensible, transparent, and Git-native.

---

## Project Purpose

This project aims to **map the data ecosystems of children's social care** as a **searchable, structured resource**.

By gathering structured metadata, documentation, plans, rules, and relationships across CSC tools and services, the goal is to create a **shared map of development activity and information flows**.

This knowledge base is intended to:

- Help colleagues find out **what work is happening in the sector**, particularly in areas related to digital development or data transformation
- Support **collaboration and reuse**, by surfacing siloed or local efforts that may align with others
- Provide **contextual and visual mapping** of systems, people, services and frameworks
- Encourage direct **contributions from local teams**, building a bottom-up, federated model of knowledge management

---

## Features

- Full-text search across `.md`, `.pdf`, `.html`, `.py`, `.js`, `.yml`, and `.yaml` documents
- Graph-based relationship rendering using Cytoscape.js
- Normalised text extraction via `nltk`
- Search index + schema validation scripts
- SCCM concept alignment across YAML content
- Local document upload (`/docs/`) for manual additions
- GitHub integration for syncing external repo docs
- Modular structure that supports standalone or embedded use

---

## Project Layout

```
/workspaces/d2i-map-of-the-world-mkdocs/
├── admin_scripts/        # Python scripts for index building, validation, sync
├── data_yml/             # SCCM-aligned YAML records (collections, plans, events...)
│   ├── organizations/
│   ├── relationships/
│   ├── services/
│   ├── rules/
│   ├── events/
│   └── ...
├── data_published/       # Cached/publicly released data extracts
├── data_repos/           # Cloned GitHub documentation sources
├── docs/                 # MkDocs content (HTML, Markdown, PDF, JS, CSS)
│   ├── js/
│   ├── css/
│   ├── data/
│   │   ├── search_index.json
│   │   └── graph_data.json
│   └── *.md
├── mkdocs.yml            # Site config
├── requirements.txt
├── setup.sh              # Dev setup (codespaces or local)
└── README.md
```

---

## Getting Started (Dev + CLI)

### ✅ Environment Setup

```bash
./setup.sh  # one-time setup (pip install, nltk, etc.)
```

### 🧪 Run locally

```bash
mkdocs serve
# or if port conflict:
mkdocs serve --dev-addr=0.0.0.0:8001
```

### 🛠 Rebuild Search Index + Graph

```bash
python admin_scripts/build_main_search_index.py
python admin_scripts/build_cytoscape_json.py
```

### 🔍 Validate YAML records

```bash
python admin_scripts/validate_yml_objects.py
```

### 🧹 Cleanup (optional)

```bash
rm -rf site/
```

---

## Tech Stack

- **MkDocs** with Material theme
- **Python 3.9+**
- **NLTK** for text preprocessing
- **YAML** for data records
- **Cytoscape.js** for client-side graph rendering
- **JavaScript** for search UI
- **pdfplumber**, `bs4`, `re`, `json`, `glob` for parsing and index creation

---

## Development Notes

- YAML records follow SCCM concepts: `OBJECT`, `AGENT`, `SERVICE`, `EVENT`, `COLLECTION`, `OBSERVATION`, `RELATIONSHIP`, etc.
- Each YAML file should include a `name`, `description`, and optional `@type`, `tags`, `related_to`, `source_url`, etc.
- `search_index.json` and `graph_data.json` are regenerated via scripts and used by the frontend
- Folder structure matters: new categories of YAML content should be placed in their own folder inside `/data_yml/`
- Scraped or imported documentation (e.g. Ofsted inspections, SEND guidance) lives in `/docs/` or `/data_published/`

---

## Future Work

- SCCM-compliant export to RDF / JSON-LD
- Enhanced relationship modelling (multi-level RELATIONSHIP, EVENT chains)
- Editable front-end (e.g. via YAML form editor or streamlit-like UI)
- Scaled search index using DuckDB or WASM-based backend
- Expanded integration across D2I GitHub repos via cross-referencing tags

---

## Developer To-Dos

- Consider how best to model *temporal relationships* (e.g. `start_date`, `end_date`, `published`)
- Decide on storing personal names (e.g. contributors, collaborators) in `AGENT` vs anonymised role-based entries
- Test load/search performance as data grows (browser-side memory vs backend streaming)

---

© Data to Insight — sector-driven, open knowledge.  
Built with care for public service data projects.
