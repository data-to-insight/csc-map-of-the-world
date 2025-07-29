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
  if (!cyContainer) {
    console.error("No element with id 'cy' found on the page.");
    return;
  }

  const graphDataURL = new URL("csc-map-of-the-world/data/graph_data.json", window.location.origin);
  const statusDisplay = document.createElement("p");
  statusDisplay.id = "graph-status";
  statusDisplay.style.marginTop = "0.5em";
  cyContainer.parentElement.insertBefore(statusDisplay, cyContainer);

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

      // Resize nodes by degree
      cy.nodes().forEach((node) => {
        const deg = node.degree();
        const size = Math.min(60, 20 + deg * 4);
        node.style({ width: size, height: size });
      });

      console.log(`Graph loaded. Nodes: ${cy.nodes().length}, Edges: ${cy.edges().length}`);

      // Show only neighbourhood of "data_to_insight" on initial load
      const defaultNode = cy.getElementById("data_to_insight");
      if (defaultNode) {
        const neighborhood = defaultNode.closedNeighborhood();
        cy.elements().difference(neighborhood).style("display", "none");
        updateStatus(neighborhood.nodes().length, cy.nodes().length);
      } else {
        updateStatus(cy.nodes().length, cy.nodes().length);
      }

      // Helper to update the visible node count
      function updateStatus(visibleCount, totalCount) {
        const status = document.getElementById("graph-status");
        if (status) {
          status.textContent = `Showing ${visibleCount} of ${totalCount} nodes`;
        }
      }

      // Get selected values from multi-select
      function getSelectedClasses(selectElement) {
        return Array.from(selectElement.selectedOptions).map(opt => opt.value);
      }

      // Filter handling
      const typeFilter = document.getElementById("typeFilter");
      const resetBtn = document.getElementById("resetView");

      if (typeFilter && resetBtn) {
        typeFilter.addEventListener("change", () => {
          const selectedClasses = getSelectedClasses(typeFilter);

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
        });

        resetBtn.addEventListener("click", () => {
          cy.elements().style("display", "element");
          Array.from(typeFilter.options).forEach(opt => opt.selected = false);
          updateStatus(cy.nodes().length, cy.nodes().length);
        });
      }
    })
    .catch((err) => {
      console.error("Failed to load graph data:", err);
      cyContainer.innerHTML = "<p style='color:red;'>Failed to load graph data. Check path or JSON format.</p>";
    });
});
