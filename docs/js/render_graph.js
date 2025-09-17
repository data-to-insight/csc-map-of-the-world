// SUMMARY: Renders Cytoscape graph with type-based filtering, uses initial org view(filter on for organisations),
// a fixed layout for isolated nodes, incl free-text search filter (via #textSearch)
// that intersects with type filter using a computed per-node search_blob(generated from yml elements).
// Added: debounced typing, context-mode (keeps neighbours visible for matched nodes),
// simple query operators (tag: & type:), URL state persistence, legend counts, and batched updates.

// revised version with node lock for unconnected
//
document.addEventListener("DOMContentLoaded", function () {
  console.log("Script loaded and DOM ready");

  const cyContainer = document.getElementById("cy");
  const typeFilter = document.getElementById("typeFilter");
  const resetBtn = document.getElementById("resetView");
  const textSearch = document.getElementById("textSearch"); // free-text search input
  const contextToggle = document.getElementById("contextModeToggle"); // Context mode: context toggle switch

  if (!cyContainer) {
    console.error("No element with id 'cy' found.");
    return;
  }

  const graphDataURL = new URL("csc-map-of-the-world/data/graph_data.json", window.location.origin);
  // Site base for building correct links on GitHub Pages (e.g. "/csc-map-of-the-world/")
  const SITE_BASE = graphDataURL.pathname.replace(/data\/graph_data\.json$/, "");


  const staticTypeColorMap = {
    "organization": "#007acc",
    "event": "#ff9800",
    "person": "#4caf50",
    "collection": "#9c27b0",
    "plan": "#e91e63",
    "rule": "#00bcd4",
    "resource": "#8bc34a",
    "service": "#ffc107",
    "other": "#999999"
  };

  // --- ensure Choices.js is available (nice multi-select UI) ---
  function ensureChoices(cb) {
    if (typeof Choices === "function") { cb(); return; }
    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = "https://cdn.jsdelivr.net/npm/choices.js/public/assets/styles/choices.min.css";
    document.head.appendChild(css);
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/choices.js/public/assets/scripts/choices.min.js";
    s.onload = cb;
    document.head.appendChild(s);
  }

  // --- text search / query funcs ---
  function debounce(fn, ms = 150) {
    let t;
    return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
  }

  function normalizeTypeToken(t) {
    const m = (t || "").toLowerCase();
    if (m === "org" || m === "organisation" || m === "organization") return "org";
    return m;
  }

  function parseQuery(q) {
    const out = { text: [], tag: [], type: [] };
    (q || "").split(/\s+/).forEach(tok => {
      if (!tok) return;
      if (tok.startsWith("tag:")) out.tag.push(tok.slice(4).toLowerCase());
      else if (tok.startsWith("type:")) out.type.push(normalizeTypeToken(tok.slice(5)));
      else out.text.push(tok.toLowerCase());
    });
    return out;
  }

  function readStateFromHash() {
    const params = new URLSearchParams((location.hash || "").replace(/^#/, ""));
    const types = (params.get("types") || "").split(",").map(s => s.trim()).filter(Boolean);
    const q = params.get("q") || params.get("query") || "";
    return { types, q };
  }

  function updateHash(types, q) {
    const params = new URLSearchParams();
    if (types && types.length) params.set("types", types.join(","));
    if (q) params.set("q", q);
    const str = params.toString();
    if (str) location.hash = str; else history.replaceState(null, "", location.pathname + location.search);
  }

  // Load graph
  fetch(graphDataURL)
    .then((response) => {
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return response.json();
    })
    .then((data) => {
      // Remove self-loops
      data.elements = data.elements.filter(el => {
        if (el.group === "edges" && el.data.source === el.data.target) {
          console.warn("Removing self-loop:", el.data);
          return false;
        }
        return true;
      });

      // Assign lowercase class names
      data.elements.forEach(el => {
        if (el.group === "nodes") {
          const type = (el.data?.type || "other").toLowerCase();
          el.classes = type === "organization" ? "org" : type;
        }
      });

      // Node color styling
      const dynamicNodeStyles = Object.entries(staticTypeColorMap).map(([cls, color]) => ({
        selector: `.${cls === "organization" ? "org" : cls}`,
        style: {
          "background-color": color,
          "background-opacity": 1
        }
      }));

      const cy = cytoscape({
        container: cyContainer,
        elements: data.elements,
        layout: { name: "preset" },  // We'll call layout manually after positioning isolateds
        style: [
          {
            selector: "node",
            style: {
              label: "data(label)",
              "text-valign": "center",
              "color": "#000",
              "font-size": 12,
              "text-outline-width": 0,
            }
          },
          ...dynamicNodeStyles,
          {
            selector: "edge",
            style: {
              "label": "data(label)",
              "font-size": 9,
              "text-rotation": "autorotate",
              "text-margin-y": -5,
              "color": "#444",
              "width": 2,
              "line-color": "#aaa",
              "target-arrow-color": "#aaa",
              "target-arrow-shape": "triangle",
              "curve-style": "bezier",
            }
          },
          // highlight nodes that match the text query
          {
            selector: "node.match",
            style: {
              "border-width": 3,
              "border-color": "#333",
              "shadow-blur": 12,
              "shadow-opacity": 0.4,
              "shadow-offset-x": 0,
              "shadow-offset-y": 0
            }
          }
        ]
      });

      // Load related_nodes.json if present (non-blocking)
      const relatedURL = new URL("csc-map-of-the-world/data/related_nodes.json", window.location.origin);
      fetch(relatedURL)
        .then(r => r.ok ? r.json() : {})
        .then(obj => { window.__relatedIndex = obj || {}; })
        .catch(() => { window.__relatedIndex = {}; });

      // Ensure the details panel exists even if the page forgot to include it
      let panel = document.getElementById("nodePanel");
      if (!panel) {
        panel = document.createElement("aside");
        panel.id = "nodePanel";
        panel.className = "node-panel";
        document.body.appendChild(panel);
      }

      // --- Side panel (V2) ---
      function openNodePanel(node) {
        if (!panel) return;
        try {
          const esc = (s) =>
            s == null
              ? ""
              : String(s).replace(/[&<>"']/g, (c) => ({
                  "&": "&amp;",
                  "<": "&lt;",
                  ">": "&gt;",
                  '"': "&quot;",
                  "'": "&#39;",
                })[c]);

          const d = node.data();
          const tagsHtml  = (d.tags || []).map(t => `<span>#${esc(t)}</span>`).join("");

          const pageUrl = d.page_url
            ? `${SITE_BASE}${String(d.page_url).replace(/^\/+/, "")}`
            : (d.slug ? `${SITE_BASE}${String(d.slug).replace(/^\/+/, "")}/` : "");

          const searchUrl = `${SITE_BASE}search/?q=${encodeURIComponent(d.slug || d.label || d.id || "")}`;
          const hasRelated = window.__relatedIndex && d.slug && window.__relatedIndex[d.slug];

          const websiteRow = d.website ? `
            <div class="row">
              <div class="subhead"><strong>Website</strong></div>
              <div><a href="${esc(d.website)}" target="_blank" rel="noopener">${esc(d.website)}</a></div>
            </div>` : "";

          const projectsRow = (Array.isArray(d.projects) && d.projects.length) ? `
            <div class="row">
              <div class="subhead"><strong>Projects</strong></div>
              <ul style="margin:6px 0 0 18px; padding:0;">
                ${d.projects.map(p => `<li>${esc(p).replace(/[_-]/g," ")}</li>`).join("")}
              </ul>
            </div>` : "";

          const personsRow = (Array.isArray(d.persons) && d.persons.length) ? `
            <div class="row">
              <div class="subhead"><strong>People</strong></div>
              <ul style="margin:6px 0 0 18px; padding:0;">
                ${d.persons.map(p => {
                  const name = esc(p.name || "");
                  const role = p.role ? ` — ${esc(p.role)}` : "";
                  const frm  = p.from ? ` <span style="color:#666;">(${esc(p.from)})</span>` : "";
                  return `<li>${name}${role}${frm}</li>`;
                }).join("")}
              </ul>
            </div>` : "";

          const orgMetaRow = (d.organisation_type || d.region) ? `
            <div class="row">
              <div class="subhead"><strong>Organisation</strong></div>
              <div>
                ${d.organisation_type ? `<div>Type: ${esc(d.organisation_type)}</div>` : ""}
                ${d.region ? `<div>Region: ${esc(d.region)}</div>` : ""}
              </div>
            </div>` : "";

          const notesRow = d.notes ? `
            <div class="row">
              <div class="subhead"><strong>Notes</strong></div>
              <div>${esc(d.notes)}</div>
            </div>` : "";

          panel.innerHTML = `
            <div class="row" style="display:flex; justify-content: space-between; align-items:center;">
              <h3>${esc(d.label || d.slug || d.id || "(untitled)")}</h3>
              <button id="panelClose">✕</button>
            </div>
            <div class="meta">${esc((d.type||"").toLowerCase())}</div>

            <div class="row">${esc((d.summary || "")).slice(0, 800)}</div>
            <div class="row tags">${tagsHtml}</div>

            ${websiteRow}
            ${projectsRow}
            ${personsRow}
            ${orgMetaRow}
            ${notesRow}

            <div class="row toolbar" style="display:flex; gap:8px; margin-top:10px;">
              <a href="${esc(searchUrl)}">Search</a>
              ${pageUrl ? `&nbsp;&nbsp;|&nbsp;&nbsp;<a href="${esc(pageUrl)}">Open details</a>` : ""}
              ${hasRelated ? `<button data-related-slug="${esc(d.slug)}">Show related</button>` : ""}
            </div>
          `;
          panel.classList.add("open");

          // ensure visible
          panel.style.transform = "translateX(0)";
          panel.style.display = "block";
          // // Fallback in case CSS class isn’t present:
          // if (getComputedStyle(panel).transform === "matrix(1, 0, 0, 1, 0, 0)" ||
          //     getComputedStyle(panel).transform === "none") {
          //   panel.style.transform = "translateX(0)";  // ensure visible
          // }

        } catch (err) {
          console.error("openNodePanel failed:", err);
        }
      }

      // Fallback styles if the CSS block isn't present or overridden
      function applyPanelBaseStyles(p) {
        const cs = window.getComputedStyle(p);
        const needsFix =
          cs.position !== "fixed" ||
          cs.transform === "none" ||
          parseInt(cs.zIndex || "0", 10) < 1000;

        if (needsFix) {
          // Minimal but robust defaults
          Object.assign(p.style, {
            position: "fixed",
            top: "96px",
            right: "16px",
            width: "min(380px, 95vw)",
            maxHeight: "70vh",
            overflow: "auto",
            background: "#fff",
            border: "1px solid #ddd",
            borderRadius: "8px",
            boxShadow: "0 10px 24px rgba(0,0,0,0.12)",
            padding: "12px 14px",
            zIndex: "9999",         // higher than graph
            transform: "translateX(110%)",
            transition: "transform 160ms ease-in-out",
          });
        }
      }
      applyPanelBaseStyles(panel);


      function closeNodePanel() {
        if (!panel) return;

          panel.classList.remove("open");
          panel.style.transform = "translateX(110%)"; // fallback close
          panel.style.display = ""; // clear any inline
        }

      // Open on node tap
      cy.on("tap", "node", (e) => openNodePanel(e.target));

      // // Close on tapping empty background of the graph
      // cy.on("tap", (e) => {
      //   if (e.target === cy) closeNodePanel();
      // });

      // Close on X button and handle "Show related"
      document.addEventListener("click", (ev) => {
        const closeHit = ev.target.id === "panelClose" || ev.target.closest("#panelClose");
        if (closeHit) {
          ev.preventDefault();
          ev.stopPropagation();
          closeNodePanel();
          return;
        }

        const btn = ev.target.closest("button[data-related-slug]");
        if (btn) {
          const slug = btn.getAttribute("data-related-slug");
          if (slug && window.__relatedIndex) {
            const rel = window.__relatedIndex[slug] || [];
            filterToRelated(rel.map(r => r.slug));
            // optionally: closeNodePanel();
          }
          return;
        }
      });
      // --- end side panel ---

      // === Isolated node layout logic ===
      // to reduce unpredicable/messy layout, force unconnected nodes into fixed rows on lowest frame edge
      const connected = cy.nodes().filter(n => n.connectedEdges().length > 0);
      const isolated = cy.nodes().filter(n => n.connectedEdges().length === 0);

      const padding = 50;
      const xSpacing = 120; // split spacing away from const spacing = 120; so we have some flex
      const ySpacing = 40; // row(s) distance vertical
      const nodesPerRow = Math.max(3, Math.ceil(Math.sqrt(isolated.length))); // ensure static nodes fit row
      isolated.forEach((node, i) => {
        const row = Math.floor(i / nodesPerRow);
        const col = i % nodesPerRow;
        node.position({
          x: padding + col * xSpacing,
          y: cyContainer.clientHeight - padding - row * ySpacing
        });
        node.lock();
      });

      // Apply cose layout only to connected nodes
      connected.unlock(); // Unlock in case locked
      cy.layout({
        name: "cose",
        animate: true,
        padding: 50,
        boundingBox: { x1: 0, y1: 0, x2: cyContainer.clientWidth, y2: cyContainer.clientHeight - 200 },
        fit: true,
        nodeDimensionsIncludeLabels: true
      }).run();

      // === Resize nodes by degree
      cy.nodes().forEach((node) => {
        const deg = node.degree();
        const size = Math.min(60, 20 + deg * 4);
        node.style({ width: size, height: size });
      });

      // build legend block (keep reference rows for live counts)
      const legendBlock = document.createElement("details");
      legendBlock.id = "static-legend";
      legendBlock.open = false;
      legendBlock.style = "margin-top: 1em; padding: 0.5em; border: 1px solid #ccc; background: #fafafa; border-radius: 4px; font-size: 0.9em;";

      const summary = document.createElement("summary");
      summary.textContent = "Show Graph Legend";
      legendBlock.appendChild(summary);

      const legendList = document.createElement("div");
      legendList.style = "margin-top: 0.5em;";
      Object.entries(staticTypeColorMap).forEach(([type, color]) => {
        const row = document.createElement("div");
        row.style = "display: flex; align-items: center; margin: 4px 0;";
        const cls = type === "organization" ? "org" : type;
        row.dataset.type = cls;
        row.innerHTML = `
          <span style="width: 14px; height: 14px; background: ${color}; display: inline-block; margin-right: 6px; border-radius: 3px;"></span> ${type.charAt(0).toUpperCase() + type.slice(1)}
        `;
        legendList.appendChild(row);
      });
      legendBlock.appendChild(legendList);
      cyContainer.parentElement.appendChild(legendBlock);

      // === Filter logic ===
      function updateStatus(visible, total) {
        const status = document.getElementById("graph-status");
        if (status) status.textContent = `Showing ${visible} of ${total} nodes`;
      }

      function getSelectedClasses() {
        if (!choicesInstance) return [];
        return choicesInstance.getValue(true);
      }

      function filterToRelated(slugs) {
        if (!Array.isArray(slugs) || !slugs.length) return;
        cy.batch(() => {
          cy.nodes().forEach(n => {
            const s = n.data("slug");
            const show = !!(s && slugs.includes(s));
            n.style("display", show ? "element" : "none");
          });
          cy.edges().forEach(e => {
            const show = e.source().style("display") !== "none" && e.target().style("display") !== "none";
            e.style("display", show ? "element" : "none");
          });
          if (contextModeEnabled) {
            const visible = cy.nodes(":visible");
            const neigh = visible.closedNeighborhood();
            neigh.style("display","element");
          }
        });
      }

      // free-text query state + matcher (+ simple operators)
      let currentQuery = "";
      function nodeMatchesQuery(node, q) {
        if (!q) return true;
        const qobj = parseQuery(q);
        const nodeTypeClass = (node.classes()[0] || "").toLowerCase();
        const nodeTypeData = (node.data("type") || "").toLowerCase();
        const nodeTags = (node.data("tags") || []).map(String).map(s => s.toLowerCase());
        const blob = (node.data("search_blob") || node.data("label") || "").toLowerCase();

        // operator: type:
        if (qobj.type.length) {
          const matchesType = qobj.type.some(t => {
            if (t === "org") return nodeTypeClass === "org" || nodeTypeData === "organization";
            return nodeTypeClass === t || nodeTypeData === t;
          });
          if (!matchesType) return false;
        }

        // operator: tag:
        if (qobj.tag.length) {
          const hasAnyTag = qobj.tag.some(t => nodeTags.includes(t));
          if (!hasAnyTag) return false;
        }

        // remaining text tokens must all be found
        return qobj.text.every(t => blob.includes(t));
      }

      function applyFilter() {
        const selected = getSelectedClasses();
        const q = (currentQuery || "").trim().toLowerCase();

        cy.batch(() => {
          if (!selected.length && !q) {
            cy.elements().style("display", "element");
            cy.nodes().removeClass("match");
            updateStatus(cy.nodes().length, cy.nodes().length);
            updateHash([], "");
            // update legend counts
            Object.keys(staticTypeColorMap).forEach(type => {
              const cls = type === "organization" ? "org" : type;
              const count = cy.nodes(`.${cls}:visible`).length;
              const row = document.querySelector(`#static-legend [data-type="${cls}"]`);
              if (row) {
                const nice = type.charAt(0).toUpperCase() + type.slice(1);
                row.innerHTML = `
                  <span style="width: 14px; height: 14px; background: ${staticTypeColorMap[type]}; display: inline-block; margin-right: 6px; border-radius: 3px;"></span> ${nice} (${count})
                `;
              }
            });
            return;
          }

          cy.nodes().forEach(node => {
            const nodeCls = node.classes()[0];
            const typeOk = !selected.length || selected.includes(nodeCls);
            const textOk = nodeMatchesQuery(node, q);
            const show = typeOk && textOk;
            node.style("display", show ? "element" : "none");
            if (q) node.toggleClass("match", show); else node.removeClass("match");
          });

          cy.edges().forEach(edge => {
            const show = edge.source().style("display") !== "none" &&
                         edge.target().style("display") !== "none";
            edge.style("display", show ? "element" : "none");
          });

          if (contextModeEnabled && q) {
            const matched = cy.nodes(".match");
            if (matched.length) {
              const neighbors = matched.closedNeighborhood(); // nodes + incident edges
              neighbors.style("display", "element");
            }
          }

          const visible = cy.nodes().filter(n => n.style("display") !== "none").length;
          updateStatus(visible, cy.nodes().length);

          // update legend counts
          Object.keys(staticTypeColorMap).forEach(type => {
            const cls = type === "organization" ? "org" : type;
            const count = cy.nodes(`.${cls}:visible`).length;
            const row = document.querySelector(`#static-legend [data-type="${cls}"]`);
            if (row) {
              const nice = type.charAt(0).toUpperCase() + type.slice(1);
              row.innerHTML = `
                <span style="width: 14px; height: 14px; background: ${staticTypeColorMap[type]}; display: inline-block; margin-right: 6px; border-radius: 3px;"></span> ${nice} (${count})
              `;
            }
          });

          updateHash(selected, q);
        });
      }

      // Set up Choices after DOM + data (ensures CSS/JS are present)
      let choicesInstance = null;
      if (typeFilter) {
        ensureChoices(() => {
          choicesInstance = new Choices(typeFilter, {
            removeItemButton: true,
            searchEnabled: false,
            shouldSort: false,
            placeholderValue: "Filter by type...",
          });
          choicesInstance.setChoiceByValue("org");
          typeFilter.addEventListener("change", applyFilter);
        });
      }

      // Context toggle (bind AFTER applyFilter exists)
      let contextModeEnabled = contextToggle ? contextToggle.checked : true;
      if (contextToggle) {
        contextToggle.addEventListener("change", () => {
          contextModeEnabled = contextToggle.checked;
          applyFilter();
        });
      }

      // Debounced input binding
      if (textSearch) {
        textSearch.addEventListener("input", debounce((e) => {
          currentQuery = e.target.value || "";
          applyFilter();
        }, 150));
      }

      // Reset
      resetBtn.addEventListener("click", () => {
        cy.batch(() => {
          cy.elements().style("display", "element");
          if (choicesInstance) choicesInstance.removeActiveItems();
          if (textSearch) textSearch.value = "";
          cy.nodes().removeClass("match");
          currentQuery = "";
          updateStatus(cy.nodes().length, cy.nodes().length);
          updateHash([], "");
          cy.fit();
          // refresh legend counts
          Object.keys(staticTypeColorMap).forEach(type => {
            const cls = type === "organization" ? "org" : type;
            const count = cy.nodes(`.${cls}:visible`).length;
            const row = document.querySelector(`#static-legend [data-type="${cls}"]`);
            if (row) {
              const nice = type.charAt(0).toUpperCase() + type.slice(1);
              row.innerHTML = `
                <span style="width: 14px; height: 14px; background: ${staticTypeColorMap[type]}; display: inline-block; margin-right: 6px; border-radius: 3px;"></span> ${nice} (${count})
              `;
            }
          });
        });
      });

      // Status counter
      const statusDisplay = document.createElement("p");
      statusDisplay.id = "graph-status";
      statusDisplay.style.fontSize = "0.75em";
      statusDisplay.style.margin = "0.5em 0";
      cyContainer.parentElement.insertBefore(statusDisplay, cyContainer);

      // === Initial org filter or state from URL
      const initialClass = "org";
      const { types: hashTypes, q: hashQ } = readStateFromHash();
      const hasInitialState = (hashTypes && hashTypes.length) || (hashQ && hashQ.length);

      if (hasInitialState) {
        if (choicesInstance) {
          choicesInstance.removeActiveItems();
          hashTypes.forEach(t => choicesInstance.setChoiceByValue(normalizeTypeToken(t)));
        } else if (typeFilter && hashTypes && hashTypes.length) {
          // fallback: set raw select values until Choices initializes
          Array.from(typeFilter.options).forEach(opt => {
            opt.selected = hashTypes.includes(opt.value);
          });
        }
        if (textSearch) {
          textSearch.value = hashQ || "";
          currentQuery = hashQ || "";
        }
        applyFilter();
      }

      setTimeout(() => {
        if (hasInitialState) return; // respect URL-provided state
        cy.nodes().forEach((node) => {
          const show = node.hasClass(initialClass);
          node.style("display", show ? "element" : "none");
        });
        cy.edges().forEach((edge) => {
          const srcVisible = edge.source().style("display") !== "none";
          const tgtVisible = edge.target().style("display") !== "none";
          edge.style("display", srcVisible && tgtVisible ? "element" : "none");
        });
        updateStatus(cy.nodes().filter(n => n.style("display") !== "none").length, cy.nodes().length);
        // initialize legend counts
        Object.keys(staticTypeColorMap).forEach(type => {
          const cls = type === "organization" ? "org" : type;
          const count = cy.nodes(`.${cls}:visible`).length;
          const row = document.querySelector(`#static-legend [data-type="${cls}"]`);
          if (row) {
            const nice = type.charAt(0).toUpperCase() + type.slice(1);
            row.innerHTML = `
              <span style="width: 14px; height: 14px; background: ${staticTypeColorMap[type]}; display: inline-block; margin-right: 6px; border-radius: 3px;"></span> ${nice} (${count})
            `;
          }
        });
      }, 200);
    })
    .catch(err => {
      console.error("Failed to load graph data:", err);
      cyContainer.innerHTML = "<p style='color:red;'>Could not load graph data.</p>";
    });
});
