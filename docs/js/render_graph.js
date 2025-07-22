document.addEventListener("DOMContentLoaded", function () {
  const cyContainer = document.getElementById("cy");
  if (!cyContainer) {
    console.error("No element with id 'cy' found on the page.");
    return;
  }

  // Use an absolute path based on your GitHub Pages repo name
  const graphDataURL = new URL("/d2i-map-of-the-world-mkdocs/data/graph_data.json", window.location.origin);

  fetch(graphDataURL)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
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

      console.log(`Graph loaded. Nodes: ${cy.nodes().length}, Edges: ${cy.edges().length}`);
    })
    .catch((err) => {
      console.error("Failed to load graph data:", err);
      cyContainer.innerHTML = "<p style='color:red;'>Failed to load graph data. Check path or JSON format.</p>";
    });
});
