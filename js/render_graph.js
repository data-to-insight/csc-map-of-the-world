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
  const cyContainer = document.getElementById("cy");
  const typeFilter = document.getElementById("typeFilter");
  const resetBtn = document.getElementById("resetView");

  if (!cyContainer) {
    console.error("No element with id 'cy' found.");
    return;
  }

  const graphDataURL = new URL("csc-map-of-the-world/data/graph_data.json", window.location.origin);

  // Add live count below filter
  const statusDisplay = document.createElement("p");
  statusDisplay.id = "graph-status";
  statusDisplay.style.marginTop = "0.5em";
  cyContainer.parentElement.insertBefore(statusDisplay, cyContainer);

  // Initialise Choices.js on the select dropdown
  let choicesInstance = null;
  if (typeFilter && typeof Choices === "function") {
    choicesInstance = new Choices(typeFilter, {
      removeItemButton: true,
      searchEnabled: false,
      shouldSort: false,
      placeholderValue: "Filter by type...",
    });
  }

  fetch(graphDataURL)
    .then((response) => {
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return response.json();
    })
    .then((data) => {
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
              "background-color": "#007acc",
              "text-valign": "center",
              "color": "#fff",
              "font-size": 12,
              "text-outline-width": 2,
              "text-outline-color": "#007acc",
            },
          },
          {
            selector: "edge",
            style: {
              "width": 2,
              "line-color": "#aaa",
              "target-arrow-color": "#aaa",
              "target-arrow-shape": "triangle",
              "curve-style": "bezier",
            },
          },
        ],
      });

      cy.nodes().forEach((node) => {
        const deg = node.degree();
        const size = Math.min(60, 20 + deg * 4);
        node.style({ width: size, height: size });
      });

      // Only show data_to_insight neighbourhood by default
      const defaultNode = cy.getElementById("data_to_insight");
      if (defaultNode) {
        const neighborhood = defaultNode.closedNeighborhood();
        cy.elements().difference(neighborhood).style("display", "none");
        updateStatus(neighborhood.nodes().length, cy.nodes().length);
      } else {
        updateStatus(cy.nodes().length, cy.nodes().length);
      }

      // Update visible node count
      function updateStatus(visibleCount, totalCount) {
        const status = document.getElementById("graph-status");
        if (status) {
          status.textContent = `Showing ${visibleCount} of ${totalCount} nodes`;
        }
      }

      // Helper: get selected filter values
      function getSelectedClasses() {
        if (!choicesInstance) return [];
        return choicesInstance.getValue(true); // return selected values as array
      }

      // Apply filter logic
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

        const visibleNodes = cy.nodes().filter(n => n.style("display") !== "none").length;
        updateStatus(visibleNodes, cy.nodes().length);
      }

      // Event listeners
      if (typeFilter && resetBtn) {
        typeFilter.addEventListener("change", applyFilter);
        resetBtn.addEventListener("click", () => {
          cy.elements().style("display", "element");
          if (choicesInstance) choicesInstance.removeActiveItems();
          updateStatus(cy.nodes().length, cy.nodes().length);
        });
      }
    })
    .catch((err) => {
      console.error("Failed to load graph data:", err);
      cyContainer.innerHTML = "<p style='color:red;'>Failed to load graph data. Check path or JSON format.</p>";
    });
});
