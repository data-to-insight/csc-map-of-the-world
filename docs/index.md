[![Deploy](https://img.shields.io/github/actions/workflow/status/data-to-insight/csc-map-of-the-world/deploy.yml?branch=main&style=flat-square)](https://github.com/data-to-insight/csc-map-of-the-world/actions/workflows/deploy.yml) [![Docs](https://img.shields.io/badge/docs-live-brightgreen?style=flat-square)](https://data-to-insight.github.io/csc-map-of-the-world/) [![License: MIT](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](https://choosealicense.com/licenses/mit/) [![Data refreshed](https://img.shields.io/github/last-commit/data-to-insight/csc-map-of-the-world?path=docs/data/graph_data.json&label=data%20refreshed&style=flat-square)](https://github.com/data-to-insight/csc-map-of-the-world/commits/main/docs/data/graph_data.json)


# About this project

Map of the World is an open-source knowledge base for Children’s Social Care (CSC). It brings together key documents, tools, services, and guidance into one structured, searchable map.

## What you’ll find

- A visual network showing how projects, organisations, and frameworks connect  
- A smart search tool for quick access to relevant information  
- Simple, human-readable data formats so anyone can contribute  

The aim is to make the CSC landscape clearer and more connected. Built on open technology, this project is designed to be transparent, flexible, and collaborative, helping the sector work smarter, not harder.

This proof of concept (PoC) forms part of the work toward a Centre of Excellence for CSC, building on thinking behind platforms like the Children’s Services Network and using open modelling approaches such as the Smart City Concept Model. It is designed to be lightweight, transparent, and openly extensible so others can adopt or adapt it for their own contexts.

## Purpose

This PoC is the first step toward creating a clear, searchable map of everything happening in CSC. It will bring together reports, tools, frameworks, guidance, and projects into one place so people can easily find and understand what is out there. We aim to make it simple to:

- See how initiatives, policies, and systems connect  
- Find out who is working on what and track updates  
- Bring hidden or siloed work into view to align efforts and avoid duplication  
- Give local teams a clearer picture of sector-wide activity  

## What’s included

- Published reports and official guidance  
- Data from government and local authority websites  
- Sector-developed tools and frameworks  
- Links to people and organisations (where consent or public information allows)  

All accessible through an intuitive interface with a visual map and search tools.

## Who will use it

Local authority data teams, service managers, researchers, analysts, and project leads working on CSC data or digital delivery. Ultimately, this is a collaborative tool, built with input from local authorities, analysts, service leads, academic partners, and national bodies.

## How this helps

This tool will make life easier across the CSC sector by:

- Showing the bigger picture, clarifying how local and national initiatives, policies, systems, and data sources fit together  
- Highlighting who is doing what, enabling you to track new tools, framework updates, and service changes  
- Bringing hidden work into view, helping teams align efforts, build on progress, and avoid duplication  
- Giving local authority data teams a more joined-up view of sector-wide activity  

## The plan

- **Interactive network map**, explore a live graph showing how entities, relationships, and systems connect across the CSC sector.  
- **Structured data records**, a growing library of YAML files (human-readable format) based on the Smart City Concept Model (SCCM, BSI PAS 182). These describe tools, frameworks, relationships, rules, plans, events, and guidance.  
- **Documentation hub**, technical documentation from Data to Insight (D2I) projects and Git repositories indexed for developers and analysts.  
- **Searchable resource**, a dedicated search page indexing YAML content and files (.md, .pdf, .py, .js, .html) with keyword relevance, match scoring, and metadata extraction.  
- **In development**, currently using a small sample of local authority data (around 10 sites), with plans to expand to all 153 authorities and scrape relevant CSC public sources (.gov, .edu).  

## How it is structured

The tool is built around the Smart City Concept Model (SCCM), an open framework for describing public service ecosystems. Every item in the network diagram is stored as a YAML file, which is simple and easy to edit. Each file starts with a type, for example:

- **AGENT**, people, teams, or organisations  
- **SERVICE**, a system, service, or tool  
- **EVENT**, inspections, launches, or reviews  
- **RULE / PLAN / COLLECTION**, policies, datasets, or strategies  
- **RELATIONSHIP**, links between entities (for example oversight, supply, influence)  

These YAML files are validated, searchable, and easier to edit than formats like JSON or CSV, making contributions simpler.

## How to get involved

This project is being built with the sector, for the sector, and we would welcome your input. You can help by:

- Sharing feedback on what works, what is missing, or what needs fixing  
- Contributing local projects, tools, or documentation  
- Suggesting ideas for how this tool could better support the sector  

To get involved, contact the Data to Insight team or visit our GitHub repository to explore, fork, or contribute.


If you think that this tool might be useful within the sector and want to pass this on to colleagues, feel free to make use of the below infographic that we thought might offer the key headline insights more succintly.

![Map of the World infographic](imgs/MotW-Infographic.png)




<link rel="prefetch" href="/csc-map-of-the-world/data/graph_data.lite.json" as="fetch" crossorigin>

<link rel="prefetch" href="data/search_index.json" as="fetch" crossorigin>
<link rel="prefetch" href="data/lite_index.json" as="fetch" crossorigin>
<link rel="prefetch" href="data/adjacency.json" as="fetch" crossorigin>
This PoC forms part of the work towards a [Centre of Excellence](https://www.datatoinsight.org/coe), building on the thinking behind platforms like the [Children’s Services Network](https://www.childrensservices.network/network.html) and grounded in open modelling approaches like the already mentioned [Smart City Concept Model](http://www.smartcityconceptmodel.com/).

<!-- help CDN connection for cytoscape -->
<link rel="preconnect" href="https://unpkg.com">
<link rel="dns-prefetch" href="https://unpkg.com">

<!-- high priority fetch for next nav target -->
<link rel="preload" href="data/graph_data.lite.json" as="fetch" crossorigin>
<link rel="preload" href="data/degree.json" as="fetch" crossorigin>

<script>
(function () {
  try {
    // compute robust base so works on codespaces and GH pages
    const base = new URL('.', location.href);
    const urls = [
      new URL('data/graph_data.lite.json', base).toString(),
      new URL('data/degree.json',          base).toString()
    ];

    // warm cache for next page, stash promises for reuse
    window.__graphCache = window.__graphCache || {};
    for (const u of urls) {
      if (!window.__graphCache[u]) {
        window.__graphCache[u] = fetch(u, { credentials: 'same-origin', cache: 'force-cache' })
          .then(r => r.ok ? r.json() : null)
          .catch(() => null);
      }
    }
  } catch (e) {}
})();
</script>

<!-- Pre-warm MotW data for whole site -->
<script>
(function () {
  function boot() {
    // tab-global cache, reused across MkDocs instant navigation
    window.MOTW_CACHE = window.MOTW_CACHE || {};

    // try common relative bases so this works from any page depth
    function urlCandidates(file) {
      return [
        'data/', '../data/', '../../data/', '../../../data/'
      ].map(prefix => new URL(prefix + file, window.location.href).toString());
    }

    async function fetchFirstJson(candidates) {
      for (const u of candidates) {
        try {
          const r = await fetch(u, { cache: 'force-cache' });
          if (!r.ok) continue;
          return await r.json();
        } catch (_) { /* try next */ }
      }
      throw new Error('Could not load ' + candidates[0]);
    }

    // Only start these once per tab
    if (!MOTW_CACHE.graphPromise) {
      MOTW_CACHE.graphPromise = fetchFirstJson(urlCandidates('graph_data.lite.json'))
        .then(data => (MOTW_CACHE.graphData = data, data))
        .catch(() => null);
    }
    if (!MOTW_CACHE.degreePromise) {
      MOTW_CACHE.degreePromise = fetchFirstJson(urlCandidates('degree.json'))
        .then(data => (MOTW_CACHE.degreeData = data, data))
        .catch(() => null);
    }
    // Optional, handy for panels and search
    MOTW_CACHE.detailsPromise = MOTW_CACHE.detailsPromise
      || fetchFirstJson(urlCandidates('node_details.json')).catch(() => null);
    MOTW_CACHE.litePromise = MOTW_CACHE.litePromise
      || fetchFirstJson(urlCandidates('lite_index.json')).catch(() => null);
  }

  // run on normal load and on Material page swaps
  if (window.document$) {
    document$.subscribe(boot);
  } else if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
</script>

## Soft Systems Conceptual Mapping

**System of Interest**  
> Shared|public data platform and ecosystem used within Children’s Social Care to connect people|LA colleagues, data, tools, and services

**Purpose**  
> To enable shared sector understanding, validation, discovery, and collaboration between local authorities, tool development, projects and other initiatives in CSC

**Worldview (Weltanschauung)**  
> Fragmented data landscapes transformed into a collaborative, open ecosystem using lightweight, transparent structures like SCCM, JSON, YAML + MkDocs

**Owner(s)**  
> Likely data platform stewards: D2I, local authority data teams, ecosystem developers

**Environment (External Constraints)**  
> GitHub Pages (no backend), data security and ethics, evolving standards, distributed maintenance, changing ecosystem, frameworks and statuatory guidance, browser-only deployments


---

## What’s next?

- Ongoing expansion of linked tools, rules, and frameworks
- Live|scheduled scrapes from key web resources or published docs/framesworks
- Search and filter interface (in beta, but aiming to implement network diagram filters)
- Option for local teams to submit structured entries or link live repositories
- Export options for integration into other data tools

---

**Thanks for the interest in CSC Knowledge Base Network**  
We hope it supports your work, and welcome your feedback as we continue to improve and expand it.


--- 

## Possible SCCM Mapping to CSC Eco-System

| SCCM Concept (Category)                                                                 | Suggested example(s) (in progress)                                                                                     | 
|-----------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------|
| [Community](http://www.smartcityconceptmodel.com/index.php?Action=ShowConcept&Id=161)   | South East fostering cluster                                                                                            |
| [Documentation](http://www.smartcityconceptmodel.com/index.php?Action=ShowConcept&Id=183) | [CSC Independent Review](https://assets.publishing.service.gov.uk/media/640a17f28fa8f5560820da4b/Independent_review_of_children_s_social_care_-_Final_report.pdf) |
| [Events](http://www.smartcityconceptmodel.com/index.php?Action=ShowConcept&Id=164)        | *Children’s Social Care Review*, *ILACS Inspections*, *Public Inquiries*                                                |
| [Organization](http://www.smartcityconceptmodel.com/index.php?Action=ShowConcept&Id=160) | [Data to Insight](https://www.datatoinsight.org/), [LIIA](https://www.liia.london/)                                     |
| [Persons](http://www.smartcityconceptmodel.com/index.php?Action=ShowConcept&Id=159)      | Organisational/sector tools linked where consent given or public record                                                 |
| [Plans](http://www.smartcityconceptmodel.com/index.php?Action=ShowConcept&Id=177)        | *Kinship Care Strategy*, *Children’s Social Care National Framework*                                                    |
| [Relationships](http://www.smartcityconceptmodel.com/index.php?Action=ShowModel&Id=10)   | LA-1 ↔ Supports ↔ SSD Tests, DfE ↔ Pilots ↔ API Data Flows                                                               |
| [Rules](http://www.smartcityconceptmodel.com/index.php?Action=ShowConcept&Id=175)        | Statutory Guidance, *Keeping Children Safe in Education 2025*                                                           |
| [Sector Tools](http://www.smartcityconceptmodel.com/index.php?Action=ShowConcept&Id=166) | [PATCH](https://www.datatoinsight.org/patch), ChAT                                                                      |
| [Services](http://www.smartcityconceptmodel.com/index.php?Action=ShowConcept&Id=169)     |                                                                                                                         |
                                                                                                        |


---

## Data and formats

The network visualisations, and meta data about those objects, within the site are built from structured YAML records (the source of truth), processed and published as static JSON files that the browser app loads at runtime. Parquet and FAISS artifacts built from an increasing corpora of publically available CSC sector reference data used for the search/back-end are made available for offline or downstream semantic search workflows (e.g. for LAs/data teams/stakeholders). At the moment these artifacts are built exclusively from externally sourced documents, official reports, DfE/Gov guidance, Official validation rules, social care frameworks and much, much more that defines what is currently happening within the CSC and directly related sectors' data ecosystems; but part of the planned development is to additionally include all data from the defined yaml objects shown in the network graph(s). 

## Reuse and downloads

The published set of downloadable artifacts for reuse (Parquet, FAISS), plus lightweight JSON outputs used by the website.

??? tip "Downloadable artifacts (Parquet and FAISS)"
    | Artifact | Format | Link on the site | Path in repo | What it is for |
    |---|---|---|---|---|
    | Vector chunks | Parquet | [motw_chunks.parquet](data/csc_artifacts/motw_chunks.parquet) | `docs/data/csc_artifacts/motw_chunks.parquet` | Text chunks table for semantic retrieval |
    | Vector embeddings | Parquet | [motw_vectors.parquet](data/csc_artifacts/motw_vectors.parquet) | `docs/data/csc_artifacts/motw_vectors.parquet` | Embeddings aligned to chunk ids |
    | Vector index | FAISS | [motw_index.faiss](data/csc_artifacts/motw_index.faiss) | `docs/data/csc_artifacts/motw_index.faiss` | Nearest neighbour index over embeddings |

??? info "Site outputs (JSON used by the browser)"
    | Artifact | Format | Link on the site | Path in repo | What it is for |
    |---|---|---|---|---|
    | Graph data | JSON | [graph_data.json](data/graph_data.json) | `docs/data/graph_data.json` | Nodes and edges for the Cytoscape network |
    | Search indexes | JSON | [search_index.json](data/search_index.json), [graph_search_index.json](data/graph_search_index.json) | `docs/data/search_index.json`, `docs/data/graph_search_index.json` | Fast static search for the site |
