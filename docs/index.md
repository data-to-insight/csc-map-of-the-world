# CSC Map of the World (PoC)

The D2I **CSC Map of the World or Knowledge Base** is an open, evolving tool designed to help map and visualise links between data, services, tools, and organisations that make up the **children’s social care (CSC) data ecosystem**.

It brings together structured descriptions of tools, people(where agreed), services, frameworks, systems, and ongoing development work across the sector — using both visual and searchable formats — to potentially support **collaboration, data leadership, strategic planning, and operational insight**.

---

## How do we see this being of use?

During investigation around the various potential realisations, along with the scale, scope and limitations of the tool it's hard to be precise on use-cases. However, if it's possible to create a searchable map/resource that can act as a hub for collected data resources from multiple source types, published reports, pre-defined data objects, scraped web data from such as DfE, local authorities, relevant 3rd parties where the user is able to drill down into some of this or visualise in a structured manner how CSC work might be connected. We might be able to: 

- **Understand relationships** between local and national CSC data tools, standards, organisations, and policies
- **Explore who is doing what** — whether a new tool is being developed, a framework revised, or a service restructured
- **Surface siloed or lesser-known projects** so that local work can align with wider trends or efforts elsewhere
- **Contribute to local insight or work** to help improve the sector-wide view

We aim to offer **a map of data and service activity**, developed in collaboration with local authority teams, analysts, service leads, academic partners, and national bodies.

---

## Who is this for?

We envisage use-cases from:

- **Local authority data and performance teams**
- **Children’s social care service managers and strategic leads**
- **Academic researchers and national analysts**
- **Project leads, developers and architects working in CSC data or digital delivery**

---

## What’s included?

- **Interactive network map**: Navigate to [Network](network.md) to view entities, relationships, and systems as a live graph
- **Structured data records**: Underpinning the map is a growing library of structured YAML records, aligned to a SCCM concept framework that describe:
  - Tools and systems (e.g. PATCH, Validator 903)
  - Frameworks and inspections (e.g. Ofsted ILACS, JTAI)
  - Relationships and service models
  - Rules, plans, events and guidance
- **Searchable resource**: The [search page](search.md) enables you to explore the structured data model directly.
  - This is separate from the standard MkDocs search (top-right), which only covers page text within this site.
  - The CSC knowledge search indexes structured YAML content as well as `.md`, `.pdf`, `.py`, `.js` and `.html` files, and supports keyword relevance, match scoring, and metadata extraction.
  - (in dev)The search index currently takes a data sample direct from local authority web sites. At the moment this is throttled to ~10, but with the potential to extract simplistic reference resource(s) directly from all ~153
- **Documentation hub**: Local documentation from D2I projects(Git repos) is also indexed to provide technical context
---

## How is this structured?

Records in this tool are aligned with the **Smart City Concept Model (SCCM)**, an open framework for describing public service ecosystems. Every entity towards the documented network(diagram) is represented as a YAML file using one or more of the following types:

- `@type: AGENT` – people, teams, or organisations
- `@type: SERVICE` – a system, service or tool
- `@type: EVENT` – events such as inspections, launches, reviews
- `@type: RULE`, `@type: PLAN`, `@type: COLLECTION` – policy elements, datasets or strategies
- `@type: RELATIONSHIP` – links between entities (e.g. oversight, supply, influence)

These files are validated, searchable, and designed to be easy to contribute to.

---

## How can I get involved?

This project is being developed **with and for the sector**. We welcome:

- Feedback on what’s useful or missing(or broken)
- Contributions of local projects or documentation
- Suggestions for how the tool could better support planning and analysis

To contribute or get involved, please contact the [Data to Insight](https://github.com/data-to-insight) team or fork from/visit the [GitHub repo](https://github.com/data-to-insight/d2i-map-of-the-world-mkdocs).

---

## Foundations and Inspiration

This tool builds on the thinking behind platforms like the [Children’s Services Network](https://www.childrensservices.network/network.html) and is grounded in open modelling approaches like the [Smart City Concept Model](http://www.smartcityconceptmodel.com/).

It is designed to be lightweight, transparent, and **openly extensible** — enabling others to adopt or adapt it for their own contexts.

---

## What’s next?

- Ongoing expansion of linked tools, rules, and frameworks
- Live|scheduled scrapes from key web resources or published docs/framesworks
- Search and filter interface (in beta, but aiming to implement network diagram filters)
- Option for local teams to submit structured entries or link live repositories
- Export options for integration into other data tools

---

**Thanks for the interest in D2I Knowledge Base**  
We hope it supports your work, and welcome your feedback as we continue to improve and expand it.
