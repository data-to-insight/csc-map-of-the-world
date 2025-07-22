document.addEventListener("DOMContentLoaded", function () {
  const basePath = window.location.pathname.split("/").slice(0, -1).join("/") + "/";
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

        style: [
          {
            selector: "node",
            style: {
              label: "data(label)",
              "text-valign": "top",
              "text-halign": "center",
              "font-size": "8px",
              "text-wrap": "wrap",
              "text-max-width": 80,
              "text-margin-y": -10,
              color: "#000",
            },
          },
          { selector: "node.org", style: { "background-color": "#2ECC40" } },
          { selector: "node.service", style: { "background-color": "#FF851B" } },
          { selector: "node.plan", style: { "background-color": "#B10DC9" } },
          { selector: "node.event", style: { "background-color": "#FF4136" } },
          { selector: "node.relationship", style: { "background-color": "#7FDBFF" } },
          { selector: "node.person", style: { "background-color": "#AAAAAA" } },
          { selector: "node.collection", style: { "background-color": "#FFD700" } },
          { selector: "node.dataset", style: { "background-color": "#6A5ACD" } },
          { selector: "node.tool", style: { "background-color": "#20B2AA" } },
          { selector: "node", style: { width: 30, height: 30 } },
          {
            selector: "edge",
            style: {
              width: 1,
              "line-color": "#ccc",
              "target-arrow-color": "#ccc",
              "target-arrow-shape": "triangle",
              label: "data(label)",
              "font-size": "8px",
              "text-rotation": "autorotate",
              "text-margin-y": -8,
              "curve-style": "bezier"
            }
          },
          {
            selector: "edge[label = 'informs']",
            style: {
              "line-style": "dashed",
              "line-color": "#0074D9",
              "target-arrow-color": "#0074D9"
            }
          },
          {
            selector: "edge[label = 'collaboratesWith']",
            style: {
              "line-color": "#2ECC40",
              "target-arrow-color": "#2ECC40",
              width: 1
            }
          }
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
      document.getElementById("cy").innerHTML =
        "<p style='color:red;'>Failed to load graph data. Check path or JSON format.</p>";
    });
});
