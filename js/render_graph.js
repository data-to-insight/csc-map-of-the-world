document.addEventListener("DOMContentLoaded", function () {
  const basePath = "/d2i-map-of-the-world-mkdocs/";  // hardcoded repo root
  const graphPath = basePath + "data/graph_data.json";

  fetch(graphPath)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then((data) => {
      const cy = cytoscape({
        container: document.getElementById("cy"),
        elements: data.elements,
        layout: {
          name: "cose",
          animate: true,
          padding: 30,
        },
        style: [/* your existing styling config unchanged */]
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
      document.getElementById("cy").innerHTML =
        "<p style='color:red;'>Failed to load graph data. Check path or JSON format.</p>";
    });
});
