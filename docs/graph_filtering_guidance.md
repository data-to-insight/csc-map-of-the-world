# Graph Filtering Guide

Make the most of the network graph using **type filters**, a **search box**, and an optional **context mode** that reveals nearby connections. This page explains how it works and gives practical examples.

---

## Quick start

- **Type filter** (chips/select): show only Organizations, Events, Plans, etc.
- **Search box**: find nodes by name, tags, summary text, or slug (we index these into a `search_blob` for fast matching).
- **Context mode**: optionally keep **neighbours of matches** visible so you can see how results connect.
- **Shareable views**: your current filter state is encoded in the URL (types + query), so you can copy the link and share what you’re seeing.
- **Legend counts**: the legend shows live totals for visible nodes by type.
- **Reset**: click *Reset view* to clear filters and fit the graph.

---

## How filtering works

Filtering is **intersection-based**:

- The **type filter** (e.g. Organizations + Events) selects *what kinds* of nodes are considered.
- The **search box** narrows this further to nodes whose text matches your query.
- The result is **Type AND Search**.

Edges remain visible **only** if both endpoints are visible. This keeps the picture tidy and relevant.

### What text is searchable?

Each node has a lightweight `search_blob` built at publish time, which includes:
- **Name/label**
- **Tags**
- **Summary/description (shortened)**
- **Slug** (path-like identifier)
- **Type** (e.g. `organization`, `event`)

The search matches plain words anywhere in that blob.

---

## Debounced typing

When you type in the search box, the filter doesn’t run on *every* keystroke. It waits ~150 ms for a short pause before applying the filter. 

**Why it helps:** As we scale up the visualised network(graph), filtering can get expensive (show/hide many nodes, recompute edges, update legend). Debouncing reduces unnecessary work and makes your searches smooth(er) but importantly reduces those our background processing overheads.

**Example:** typing `ilacs` would normally trigger 5 full filter runs. With debounce, you typically get 1–2 runs total.

---

## Context mode (keep neighbours of matches visible)

If **Context mode** is ON, then when your search finds some nodes, we also show their **immediate neighbours** and the **edges** between them. That gives you a mini ego-network around each hit, which we think offers better network exploration/search relevance.

**Example:** search `tag:ilacs`. You’ll see the nodes that are tagged `ilacs`, plus the organizations that run them, related events, or connected plans—so you understand each hit *in context*.

Turn it OFF when you want a strict, minimal view showing only the direct matches.

---

## Simple search operators (power users)

You can mix operators with plain keywords to express intent quickly:

- `type:org` — show organizations (same as picking Organizations in the type filter).
- `tag:ilacs` — show nodes with the tag `ilacs`.
- `type:event tag:training` — events tagged `training`.
- `tag:ilacs charity` — nodes tagged `ilacs` **and** whose text contains `charity`.
- `type:org type:event` — organizations **or** events (operator values are ORed).

**Rules:**  
- **Within the same operator** (e.g., multiple `type:`), values are **ORed**.  
- **Across different buckets** (type, tag, and plain text), conditions are **ANDed**.  
- Text tokens (non-operator words) must all appear somewhere in the node’s `search_blob`.

**Aliases:** `type:org`, `type:organisation`, and `type:organization` are treated the same.

---

## Combining filters: examples

- **Only organizations with ILACS in the text**  
  Type filter: Organizations; Search: `ilacs`  
  *Shows only orgs whose name/summary/tags include “ilacs”.*

- **Any node tagged ILACS that mentions Ofsted**  
  Type filter: All; Search: `tag:ilacs ofsted`  
  *Matches the ILACS tag AND the word “ofsted” appears in the node’s text.*

- **Events or Organizations related to training**  
  Type filter: All; Search: `type:event type:org training`  
  *Matches if the node is an Event OR Organization, AND contains “training”.*

- **Strict list without neighbours**  
  Toggle **Context mode** OFF; Search: `tag:procurement framework`  
  *Only nodes that match will display (no neighbours). Useful for tight lists.*

---

## URL state and sharing

When you change filters or search, the page updates the URL with your current **types** and **query**. Copy the URL to share your exact view with someone else, including the existing zoom/pan context.

---

## Legend counts

The legend shows the **number of visible nodes** per type. Counts update as you filter so you can see how your query impacts the mix.

---

## Resetting

Use the **Reset view** button to:  
- Clear the type filter and search query  
- Remove match highlighting  
- Fit the graph to the viewport

---

## Troubleshooting tips

- **Nothing shows up?** Clear the search box, check the type chips, or hit *Reset view*.
- **Too much disappears when I type?** Turn **Context mode** ON to keep neighbours of hits visible.
- **I can’t find a node I know exists.** Try broader terms, check spelling, or search by `tag:` if you know one.
- **Sharing a view.** Copy the page URL after you’ve set filters; it contains your state.

---

*This graph is built from YAML entities (Organization, Event, Plan, etc.) with extra build-time fields for search (slug, search blob). The filters you see operate entirely in the browser for quick, privacy-friendly exploration.*
