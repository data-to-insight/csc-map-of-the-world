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

  const statusDisplay = document.createElement("p");
  statusDisplay.id = "graph-status";
  statusDisplay.style.marginTop = "0.5em";
  cyContainer.parentElement.insertBefore(statusDisplay, cyContainer);

  const colorPalette = [
    "#007acc", "#ff9800", "#4caf50", "#9c27b0", "#e91e63",
    "#00bcd4", "#8bc34a", "#ffc107", "#673ab7", "#795548",
    "#3f51b5", "#f44336", "#009688", "#cddc39", "#607d8b",
    "#ff5722", "#b71c1c", "#1a237e", "#004d40", "#33691e"
  ];

  let choicesInstance = null;
  if (typeFilter && typeof Choices === "function") {
    choicesInstance = new Choices(typeFilter, {
      removeItemButton: true,
      searchEnabled: false,
      shouldSort: false,
      placeholderValue: "Filter by type...",
    });
    choicesInstance.setChoiceByValue("org"); // optional default selection
  }

  fetch(graphDataURL)
    .then((response) => {
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return response.json();
    })
    .then((data) => {
      console.log("First few elements:", data.elements.slice(0, 3));

      // Remove self-loops
      data.elements = data.elements.filter(el => {
        if (el.group === "edges" && el.data.source === el.data.target) {
          console.warn("Removing self-loop edge:", el.data);
          return false;
        }
        return true;
      });

      // Class extraction for each node
      const nodeElements = data.elements.filter(el => el.group === "nodes");

      const uniqueClasses = new Set();
      nodeElements.forEach(el => {
        let cls = "other";
        if (typeof el.data?.type === "string") {
          cls = el.data.type.toLowerCase();
        } else if (typeof el.classes === "string") {
          cls = el.classes.toLowerCase();
        }
        el.classes = cls;
        uniqueClasses.add(cls);
      });

      console.log("Legend classes to show:", [...uniqueClasses]);

      const typeColorMap = {};
      [...uniqueClasses].forEach((cls, index) => {
        typeColorMap[cls] = colorPalette[index % colorPalette.length];
      });

      console.log("typeColorMap:", typeColorMap);

      const dynamicNodeStyles = [...uniqueClasses].map(cls => ({
        selector: `.${cls}`,
        style: {
          "background-color": `${typeColorMap[cls]} !important`,
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
              "text-outline-width": 0
            },
          },
          ...dynamicNodeStyles,
          {
            selector: "edge",
            style: {
              "width": 2,
              "line-color": "#aaa",
              "target-arrow-color": "#aaa",
              "target-arrow-shape": "triangle",
              "curve-style": "bezier",
            },
          }
        ]
      });

      // Dynamic node sizing
      cy.nodes().forEach((node) => {
        const deg = node.degree();
        const size = Math.min(60, 20 + deg * 4);
        node.style({ width: size, height: size });
      });

      // Initial filter (optional)
      const initialClass = "org";
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

      // === Legend ===
      const legendContainer = document.createElement("div");
      legendContainer.id = "graph-legend";
      legendContainer.style.margin = "1em 0";
      legendContainer.style.padding = "0.5em 0";
      legendContainer.style.borderTop = "1px solid #ccc";

      const legendTitle = document.createElement("div");
      legendTitle.textContent = "Legend:";
      legendTitle.style.fontWeight = "bold";
      legendTitle.style.marginBottom = "0.5em";
      legendContainer.appendChild(legendTitle);

      Object.entries(typeColorMap).forEach(([cls, color]) => {
        const label = document.createElement("span");
        label.textContent = ` ${cls} `;
        label.style = `
          background: ${color};
          color: white;
          padding: 3px 6px;
          margin: 2px 4px 2px 0;
          border-radius: 4px;
          display: inline-block;
          font-size: 0.85em;
        `;
        legendContainer.appendChild(label);
      });

      console.log("Appending legend:", legendContainer);
      cyContainer.parentElement.appendChild(legendContainer);

      // === Filter logic ===
      function getSelectedClasses() {
        if (!choicesInstance) return [];
        return choicesInstance.getValue(true);
      }

      function updateStatus(visibleCount, totalCount) {
        const status = document.getElementById("graph-status");
        if (status) {
          status.textContent = `Showing ${visibleCount} of ${totalCount} nodes`;
        }
      }

      function applyFilter() {
        const selectedClasses = getSelectedClasses();

        if (selectedClasses.length === 0) {
          cy.elements().style("display", "element");
          updateStatus(cy.nodes().length, cy.nodes().length);
          return;
        }

        cy.nodes().forEach((node) => {
          const show = selectedClasses.some(cls => node.hasClass(cls));
          node.style("display", show ? "element" : "none");
        });

        cy.edges().forEach((edge) => {
          const srcVisible = edge.source().style("display") !== "none";
          const tgtVisible = edge.target().style("display") !== "none";
          edge.style("display", srcVisible && tgtVisible ? "element" : "none");
        });

        updateStatus(cy.nodes().filter(n => n.style("display") !== "none").length, cy.nodes().length);
      }

      if (typeFilter && resetBtn) {
        typeFilter.addEventListener("change", applyFilter);
        resetBtn.addEventListener("click", () => {
          cy.elements().style("display", "element");
          if (choicesInstance) choicesInstance.removeActiveItems();
          updateStatus(cy.nodes().length, cy.nodes().length);
          cy.fit(); // recenter and zoom to fit
        });
      }
    })
    .catch((err) => {
      console.error("Failed to load graph data:", err);
      cyContainer.innerHTML = "<p style='color:red;'>Failed to load graph data. Check path or JSON format.</p>";
    });
});
