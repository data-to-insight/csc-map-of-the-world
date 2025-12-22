# CSC Map of the World Award submission

## Name of the initiative or project

Children's Social Care Map of the World (CSC Map of the World)

## Briefly describe the initiative, including aims and objectives

Children's Social Care Map of the World is an open source knowledge base and network map for Children's Social Care. Offering the potential for a single, structured view of key CSC documents, tools, services, guidance, projects, people and data services that are currently spread across many unconnected sources, reports and key individuals within the sector.

The project builds|visualises a graph of related entities and relationships that represents the children's services data ecosystem at scale. Each node in that network, e.g an organisation, service, event, framework, plan, rule, dataset or relationship, is defined as a human readable YAML file aligned with the SAVVI Smart City Concept Model (SCCM, BSI PAS 182). This gives a clear, shared language for describing public service activity and makes the underlying model easy to reuse and extend in other contexts.

Underneath, and in combination with the graph is a compact, optimised corpus that combines content from multiple Children's Social Care source types. This includes Git repositories and technical documentation, published reports and statutory guidance, sector tools and frameworks, direct contributions from local teams and carefully scoped web scrapes of CSC relevant sites. Text is extracted once, split into coherent chunks, embedded as numerical vectors, then stored in standard Parquet tables and FAISS indexes. The result is a focused, ring fenced search resource that can be used online or offline without shipping large original PDFs or Word files.

Because these artefacts are small and self contained, the main web platform runs entirely as a static GitHub Pages site with no database and no proprietary backend. Everything is held inside Git in open formats. Any local authority or sector stakeholder can clone the repository, start from the shared corpus, add their own documents and stand up a localised Map of the World using standard open source tools.

In Discovery|Alpha phase the initiative has three initial objectives.

- Provide an up to date picture of who is doing what in Children's Social Care data and digital, including visible and hidden connections between workstreams, people, frameworks and tools.
- Reduce reliance on tacit knowledge by turning informal awareness, for example who knows a similar project elsewhere, into an explicit, navigable map of relationships, tags and shared contributors.
- Prove that a sector wide systems model and search corpus can be held in extensible YAML and compact artefacts in a way that is practical to adopt, adapt and extend by local authorities and partners.

The work supports digital innovation, data and collaboration in public services by treating the map and corpus as shared infrastructure that other tools and projects can build on.

## What are the key achievements

CSC Map of the World has delivered concrete technical and sector achievements, despite being early in its lifecycle.

- A live public site shows Children's Social Care organisations, plans, events, frameworks, rules and services as an interactive network. Users can filter by concept type, search by name, tag or free text and keep neighbouring nodes visible to see context. This moves the sector from one off diagrams and slide packs to a shared, living systems view that anyone can revisit.
- A robust SCCM based schema has been implemented in practice. Every element is stored as a YAML file with a clear `@type` such as AGENT, SERVICE, EVENT, RULE, PLAN, COLLECTION or RELATIONSHIP. This has already been used to describe national frameworks, inspections, tools and local initiatives, demonstrating that a single concept model can stretch across a diverse ecosystem while remaining understandable and maintainable.
- A reusable corpus and search layer has been built and documented. The Map of the World corpus is packaged as a small set of artefacts, for example Parquet tables of chunked text and metadata, quantised vector tables and FAISS indexes. Quantisation reduces vector storage by roughly a factor of four without a noticeable impact on search quality. Local authorities can start from this shared pack, add their own PDFs, Word documents or text files, and append to the index. Unchanged documents are skipped automatically using content hashes, so builds are incremental and repeatable.
- Guidance has been published for local reuse. A short, practical note explains how local colleagues can reuse the corpus, what each file does and how to add their own documents without rebuilding everything. This lowers the skills barrier, because teams do not need to understand FAISS or vector maths to benefit from the work.
- The project has created sector facing assets around the prototype, including an infographic that explains the concept, a soft systems map of the system of interest and a submission route that lets others propose new nodes and relationships using the same YAML schema.

Key challenges and how they were addressed.

- Fragmented information. The initiative tackled this by agreeing a single schema and map for the sector and by indexing material from multiple types of source, for example Git repos, guidance PDFs and web content from an initial sample of local authority sites.
- Hosting constraints. The decision to run entirely on GitHub Pages, with no database, was turned into a design strength by separating heavy preprocessing from the public site and by using compact artefacts only.
- Storage and performance. The team introduced chunking, quantisation and incremental builds so that search quality remains high while storage and runtime stay manageable on standard hardware.
- Skills and capacity. Plain English reuse guidance and simple contribution routes allow analysts and service colleagues to add value without needing to become machine learning specialists.

Early impact is already visible in how colleagues understand the landscape. They can see projects, people and resources that share tags, themes or contributors, rather than relying on chance conversations. This reduces duplicate effort, highlights natural collaborations and makes it easier to spot gaps. As more nodes and relationships are added, the same infrastructure can support more systematic efficiency gains by becoming the reference layer that dashboards, benchmarks or research projects draw on.

## How innovative is your initiative

We believe that this is a ground breaking initiative for Children's Social Care and for public service data more broadly, in both what it models and how it is delivered. Previous similar work in this area have created visual sector mapping, but have never been able to provide the supporting and more useful meta-data layers, nor offer an underlying full search option. These crucial elements shift beyond just any visual representation.  transformative as a valuable tool 

1. **System wide modelling rather than isolated projects.**  
   By using SCCM aligned YAML for every organisation, service, framework, rule, plan and relationship, the project provides a single, extensible way to model public service effort, resources, key people and technology stacks. That model can be forked and adapted by others, rather than being locked inside proprietary software or static reports.

2. **A focused corpus rather than generic web or AI search.**  
   The Map of the World corpus is tightly scoped to Children's Social Care and related domains, with explicit source boundaries and licensing metadata. It does not try to index everything, it focuses on authoritative, sector relevant material. Content is chunked and embedded with modern sentence level models, then stored in compact Parquet and FAISS artefacts. This gives fast, targeted retrieval that respects sector framing and context. It also allows offline and local use, for example inside a secure council environment, which general search engines and most AI tools cannot offer.

3. **Advanced methods packaged for realistic local use.**  
   The technical pipeline uses methods usually associated with large platforms, for example content hashing, uint8 quantisation and approximate nearest neighbour search, but packages them so that local teams can actually adopt them. The heavy processing happens once, upstream or locally, and the public site only ships small JSON and YAML files. This keeps the footprint low while still supporting rich search and visualisation.

4. **Git native and vendor neutral from the start.**  
   The data model, documentation, configuration and derived artefacts live in public repositories, with clear folder structures and manifest files. Anyone can inspect the history of changes, fork the project or run their own pipelines. Upstream contributions from open source developers improve the core tools and schema. Downstream, local authorities can add their own documents and nodes, or export the corpus to underpin their own dashboards, reports or internal tools.

5. **Foundations for future sector specific AI.**  
   Because the corpus is curated, ring fenced and well described, it could form part of a domain specific retrieval layer or training set for future Children's Social Care language models, subject to governance and ethics. The current focus is on retrieval, mapping and navigation rather than on building an LLM, but the foundations mean that, if the sector chooses to explore that route, the right building blocks are already in place.

## What are the key learning points

Several clear learning points have emerged that are relevant beyond this project.

- Designing for static, open infrastructure has been a positive constraint. Knowing that the public site must run with no server side code and no database forced disciplined decisions about data structures, file sizes and indexing. The outcome is a system that is simple to host and easy to mirror, which is important for resilience and for low resource environments.
- Conceptual clarity needs to come early. Explicitly using SCCM concepts such as AGENT, SERVICE, EVENT, PLAN, RULE, COLLECTION and RELATIONSHIP prevented a lot of downstream confusion. It also highlighted where Children's Social Care specific ideas stretch the base model, giving useful feedback for future standards work.
- Incremental, artefact based design has proved essential. By identifying documents with hashes and recording build state in small manifest files, the pipeline can skip unchanged material and only process what is new. This keeps runtimes manageable and makes it realistic for local teams to reuse the shared pack. It also makes it easier to maintain a clear audit trail from original documents to derived artefacts.
- Governance and scope need as much attention as technology. Even when working with public content, there are important questions about what to index, how often to update and how to communicate the purpose of the map. The project has deliberately started with a limited sample and a focus on reference style resources, with a view to co designing wider roll out and governance with the sector.
- There is strong value in making tacit knowledge explicit. Many of the most useful connections in Children's Social Care exist in people's heads, for example who worked on a previous pilot, where a particular tool is already in use or which framework overlaps with a new initiative. Mapping entities, tags and shared contributors into a searchable graph makes that knowledge visible to others and less dependent on individual memory.

In terms of replicability and scale, the pattern is straightforward to copy. Any domain that can be described using SCCM like concepts and stored as YAML files can adopt a similar approach. Others can reuse both the schema and the corpus pipeline. The technology stack is standard and low cost, so the main work for new adopters is curation and governance, not software build.

## Additional comments

CSC Map of the World builds on and connects to a wider set of Data to Insight projects that support data quality, pipelines and analytics in Children's Social Care. This provides an immediate community of practice, shared infrastructure and potential contributors.

The project has put effort into communication as well as code. The infographic, soft systems map and reuse notes are written in plain English and are aimed at senior leaders, practitioners and analysts, not only at developers. This has already made it easier to have practical conversations about where the map can help, what it should and should not include and how local teams might feed into it.

Most importantly, the initiative is explicitly positioned as with and for the sector. It is an evolving shared platform rather than a finished product. As more local authorities and partners contribute nodes, relationships and documents, the map will become a richer picture of Children's Social Care activity, and the corpus will become a more powerful shared search resource. Because it is open, portable and built on standard formats, the value does not depend on a single supplier or team. It can grow, branch and be reused in many different ways over time.

In summary, the key strengths of CSC Map of the World are.

- Impact, turning fragmented and tacit knowledge into a single, navigable map and search corpus that supports better decisions and reduces duplicate effort.
- Innovation, combining SCCM aligned modelling, compact search artefacts and static hosting to deliver something that is new in this sector yet realistic for local authorities to adopt.
- Scalability and replicability, using open formats and Git native workflows so that any interested authority or partner can reuse the approach, extend the corpus and adapt the map to their own context.
