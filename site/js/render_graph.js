document.addEventListener("DOMContentLoaded", function () {
  const container = document.getElementById("cy");
  if (!container) {
    console.warn("Graph container not found");
    return;
  }

  const graphDataURL = new URL("data/graph_data.json", window.location.origin + window.location.pathname.replace(/\/[^\/]*$/, "/"));

  fetch(graphDataURL)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then((data) => {
      const cy = cytoscape({
        container: container,
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
              "background-color": "#0074D9",
              label: "data(label)",
              color: "#fff",
              "text-valign": "center",
              "text-halign": "center",
              "font-size": "12px"
            }
          },
          {
            selector: "edge",
            style: {
              "width": 2,
              "line-color": "#ccc",
              "target-arrow-color": "#ccc",
              "target-arrow-shape": "triangle"
            }
          }
        ]
      });

      // Auto-resize nodes based on degree
      cy.nodes().forEach((node) => {
        const deg = node.degree();
        const size = Math.min(60, 20 + deg * 4);
        node.style({ width: size, height: size });
      });

      console.log(`Graph loaded. Nodes: ${cy.nodes().length}, Edges: ${cy.edges().length}`);
    })
    .catch((err) => {
      console.error("Failed to load graph data:", err);
      container.innerHTML =
        "<p style='color:red;'>Failed to load graph data. Check path or JSON format.</p>";
    });
});
