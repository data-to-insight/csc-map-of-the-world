// document.addEventListener("DOMContentLoaded", function () {
//   const cyContainer = document.getElementById("cy");
//   if (!cyContainer) {
//     console.error("No element with id 'cy' found on the page.");
//     return;
//   }

//   // Use an absolute path based on your GitHub Pages repo name
//   const graphDataURL = new URL("csc-map-of-the-world/data/graph_data.json", window.location.origin);

//   fetch(graphDataURL)
//     .then((response) => {
//       if (!response.ok) {
//         throw new Error(`HTTP error! status: ${response.status}`);
//       }
//       return response.json();
//     })
//     .then((data) => {
//       const cy = cytoscape({
//         container: cyContainer,
//         elements: data.elements,
//         layout: {
//           name: "cose",
//           animate: true,
//           padding: 30,
//         },
//         style: [
//           {
//             selector: "node",
//             style: {
//               label: "data(label)",
//               "background-color": "#007acc",
//               "text-valign": "center",
//               "color": "#fff",
//               "font-size": 12,
//               "text-outline-width": 2,
//               "text-outline-color": "#007acc",
//             },
//           },
//           {
//             selector: "edge",
//             style: {
//               "width": 2,
//               "line-color": "#aaa",
//               "target-arrow-color": "#aaa",
//               "target-arrow-shape": "triangle",
//               "curve-style": "bezier",
//             },
//           },
//         ],
//       });

//       cy.nodes().forEach((node) => {
//         const deg = node.degree();
//         const size = Math.min(60, 20 + deg * 4);
//         node.style({ width: size, height: size });
//       });

//       console.log(`Graph loaded. Nodes: ${cy.nodes().length}, Edges: ${cy.edges().length}`);
//     })
//     .catch((err) => {
//       console.error("Failed to load graph data:", err);
//       cyContainer.innerHTML = "<p style='color:red;'>Failed to load graph data. Check path or JSON format.</p>";
//     });
// });




document.addEventListener("DOMContentLoaded", function () {
  console.log("Script loaded and DOM ready");

  const cyContainer = document.getElementById("cy");
  const typeFilter = document.getElementById("typeFilter");
  const resetBtn = document.getElementById("resetView");

  if (!cyContainer) {
    console.error("No element with id 'cy' found.");
    return;
  }

  const graphDataURL = new URL("csc-map-of-the-world/data/graph_data.json", window.location.origin);

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

  let choicesInstance = null;
  if (typeFilter && typeof Choices === "function") {
    choicesInstance = new Choices(typeFilter, {
      removeItemButton: true,
      searchEnabled: false,
      shouldSort: false,
      placeholderValue: "Filter by type...",
    });
    choicesInstance.setChoiceByValue("org");
  }

  fetch(graphDataURL)
    .then((response) => {
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return response.json();
    })
    .then((data) => {
      // Filter self-loop edges
      data.elements = data.elements.filter(el => {
        if (el.group === "edges" && el.data.source === el.data.target) {
          console.warn("Removing self-loop:", el.data);
          return false;
        }
        return true;
      });

      // Assign lowercase class names for nodes
      data.elements.forEach(el => {
        if (el.group === "nodes") {
          const type = (el.data?.type || "other").toLowerCase();
          // Workaround: map "organization" type to "org" for class purposes
          el.classes = type === "organization" ? "org" : type;
        }
      });

      // Style nodes by class based on staticTypeColorMap
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
        layout: {
          name: "cose",
          animate: true,
          padding: 30,
        },
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
              "label": "data(label)",          // pull from edge labels in graph.json
              "font-size": 9,                  
              "text-rotation": "autorotate",  // rotate text along edge
              "text-margin-y": -5,            // move label closer to edge
              "color": "#444",                // label text colour
              "width": 2,
              "line-color": "#aaa",
              "target-arrow-color": "#aaa",
              "target-arrow-shape": "triangle",
              "curve-style": "bezier",
            }
          }
        ]
      });

      // Resize nodes based on degree
      cy.nodes().forEach((node) => {
        const deg = node.degree();
        const size = Math.min(60, 20 + deg * 4);
        node.style({ width: size, height: size });
      });

      // === Apply initial filter to "org" ===
      const initialClass = "org";
      function applyInitialFilter() {
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
      }

      // Delay to ensure rendering completes before applying filter
      setTimeout(() => {
        applyInitialFilter();
      }, 200);

      // === Static Legend Block ===
      /*
        We use a static legend because dynamic extraction of node types was failing.
        This happened due to issues with MkDocs page load order, caching, and asynchronous rendering.
        To ensure stability, the legend is now generated from a known fixed set of types.
      */
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
        row.innerHTML = `
          <span style="
            width: 14px;
            height: 14px;
            background: ${color};
            display: inline-block;
            margin-right: 6px;
            border-radius: 3px;
          "></span> ${type.charAt(0).toUpperCase() + type.slice(1)}
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

      function applyFilter() {
        const selected = getSelectedClasses();
        if (!selected.length) {
          cy.elements().style("display", "element");
          updateStatus(cy.nodes().length, cy.nodes().length);
          return;
        }

        cy.nodes().forEach(node => {
          const nodeCls = node.classes()[0];
          const show = selected.includes(nodeCls);
          node.style("display", show ? "element" : "none");
        });

        cy.edges().forEach(edge => {
          const show = edge.source().style("display") !== "none" &&
                       edge.target().style("display") !== "none";
          edge.style("display", show ? "element" : "none");
        });

        const visible = cy.nodes().filter(n => n.style("display") !== "none").length;
        updateStatus(visible, cy.nodes().length);
      }

      typeFilter.addEventListener("change", applyFilter);
      resetBtn.addEventListener("click", () => {
        cy.elements().style("display", "element");
        if (choicesInstance) choicesInstance.removeActiveItems();
        updateStatus(cy.nodes().length, cy.nodes().length);
        cy.fit();
      });

      // Live node count display
      const statusDisplay = document.createElement("p");
      statusDisplay.id = "graph-status";
      statusDisplay.style.fontSize = "0.75em";
      statusDisplay.style.margin = "0.5em 0";
      cyContainer.parentElement.insertBefore(statusDisplay, cyContainer);
    })
    .catch(err => {
      console.error("Failed to load graph data:", err);
      cyContainer.innerHTML = "<p style='color:red;'>Could not load graph data.</p>";
    });
});
