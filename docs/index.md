# CSC Knowledge Base Network

A structured, open-source knowledge base and ecosystem map for the **Children’s Social Care (CSC)** sector. This project brings together [Documentation], [Relationships], [Services], [Sector_Tools], [Rules], [Plans], [Events] using a flexible YAML-based data model and aiming for alignment with the [Smart City Concept Model (SCCM)](http://www.smartcityconceptmodel.com/) towards sector data interoperability.

It aims to support full-text search, (filtered)graph-based relations visualisation, and YAML schema validation across structured `.yml` records. Supporting documents (PDF, Markdown, HTML, Python, JS). Development is scaffolded/designed to be extensible, transparent, and Git-native.

**Current Dev Phase:** *Discovery-Alpha*
---

## What is this for?

This proof of concept(PoC) project explores how a structured, searchable map of Children’s Social Care (CSC) data, tools, and activity could support work across the sector. While exact use-cases are still emerging, our goal is to create a shared resource that brings together:

- published reports  
- pre-defined data objects  
- web data (e.g. from the DfE, local authorities, third parties)  
- sector-developed tools and frameworks
- connected people (organisational/sector tools linked where consent given or public record)  

All of this would be made accessible through a visual or navigable interface, allowing users to explore connections between people, projects, standards, and services.

We think this could help:

- **Make relationships clearer** — between local and national CSC initiatives, policies, systems, and data sources  
- **Show who’s doing what** — helping users track new tools, updates to frameworks, or structural changes in services  
- **Bring siloed or under-the-radar work into view** — so efforts can align, build on each other, or avoid duplication  
- **Support local teams** — by contributing to a more joined-up picture of activity across the sector  

We see this as **a collaborative mapping tool**, developed potentially with input from local authority teams, analysts, service leads, academic partners, and national bodies.


---

## Who is this for?

We envisage use-cases from:

- **Local authority data and performance teams**
- **Children’s social care service managers and strategic leads**
- **Academic researchers and national analysts**
- **Project leads, developers and architects working in CSC data or digital delivery**

---

## Plan

- **Interactive network map**: Navigate to [Network](network.md) to view entities, relationships, and systems as a live graph
- **Structured data records**: Underpinning the map is a growing library of structured YAML records, aligned to a SCCM concept framework(BSI as PAS 182) that describe:
  - Tools and systems (e.g. PATCH, Validator 903)
  - Frameworks and inspections (e.g. Ofsted ILACS, JTAI)
  - Relationships and service models
  - Rules, plans, events and guidance
- **Searchable resource**: The [search page](search.md) enables you to explore the structured data model directly.
  - This is separate from the standard MkDocs search (top-right), which only covers page text within this site.
  - The CSC knowledge search indexes structured YAML content as well as `.md`, `.pdf`, `.py`, `.js` and `.html` files, and supports keyword relevance, match scoring, and metadata extraction.
  - (in dev)The search index|scope currently takes a data *sample* direct from local authority web sites. At the moment this is throttled to ~10, but with the potential to extract simplistic reference resource(s) directly from all ~153
  - (in dev)The search index|scope aims to scrape from relevant CSC public data sources in order to increase the tool's search scope. This could schedule indexing of relevant documents or data sources from defined .gov or .edu sites.   
- **Documentation hub**: Local documentation from D2I projects(Git repos) is also live-indexed to provide technical context

---

## How is this structured?

Records in this tool are aligned with the **Smart City Concept Model (SCCM)**, an open framework for describing public service ecosystems. Every entity towards the documented network(diagram) is represented as a YAML file, defined at the top level via (SCCM concept types)[http://www.smartcityconceptmodel.com/?Action=ShowModel&Id=10]:
e.g.
- `@type: AGENT` – people, teams, or organisations
- `@type: SERVICE` – a system, service or tool
- `@type: EVENT` – events such as inspections, launches, reviews
- `@type: RULE`, `@type: PLAN`, `@type: COLLECTION` – policy elements, datasets or strategies
- `@type: RELATIONSHIP` – links between entities (e.g. oversight, supply, influence)

YAML files are validated, searchable, and designed to be easier to contribute to as they're more human readable than other structured data forms (e.g. JSON, CSV... )

Note: Further SCCM allignment examples under [Possible SCCM Mapping to CSC Eco-System]

---

## How can I get involved?

This project is being developed **with and for the sector**. We welcome:

- Feedback on what’s useful or missing(or broken)
- Contributions of local projects or documentation
- Suggestions for how the tool could better support planning and analysis

To contribute or get involved, please contact the [Data to Insight](https://github.com/data-to-insight) team or fork from/visit the [GitHub repo](https://github.com/data-to-insight/csc-map-of-the-world).

---

## Foundations and Inspiration

This tool builds on the thinking behind platforms like the [Children’s Services Network](https://www.childrensservices.network/network.html) and grounded in open modelling approaches like the already mentioned [Smart City Concept Model](http://www.smartcityconceptmodel.com/).

It is designed to be lightweight, transparent, and **openly extensible** — enabling others to adopt or adapt it for their own contexts.


# Soft Systems Conceptual Mapping – Children's Social Care Data Ecosystem

## Root Definitions

**System of Interest**  
> Shared|public data platform and ecosystem used within Children’s Social Care to connect people|LA colleagues, data, tools, and services

**Purpose**  
> To enable shared understanding, validation, discovery, and collaboration between local authorities, tools, projects and initiatives in CSC

**Worldview (Weltanschauung)**  
> Fragmented data landscapes transformed into collaborative, open ecosystems using lightweight, transparent structures like SCCM YAML + MkDocs

**Owner(s)**  
> Data platform stewards(e.g. D2I): local authority data teams, analysts, strategic alliances, and ecosystem developers

**Environment (External Constraints)**  
> GitHub Pages (no backend), data security and ethics, evolving standards, distributed maintenance, browser-only deployments


---

## What’s next?

- Ongoing expansion of linked tools, rules, and frameworks
- Live|scheduled scrapes from key web resources or published docs/framesworks
- Search and filter interface (in beta, but aiming to implement network diagram filters)
- Option for local teams to submit structured entries or link live repositories
- Export options for integration into other data tools

---

**Thanks for the interest in CSC Knowledge Base**  
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