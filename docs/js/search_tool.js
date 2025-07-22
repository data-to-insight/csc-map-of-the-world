document.addEventListener("DOMContentLoaded", function () {
  const input = document.getElementById("search-query");
  const resultsContainer = document.getElementById("search-results");

  if (!input || !resultsContainer) {
    console.warn("Search input or results container not found");
    return;
  }

  // Determine base path safely
  const pathParts = window.location.pathname.split("/");
  const basePath = "/" + pathParts.slice(1, pathParts.indexOf("d2i-map-of-the-world-mkdocs") + 1).join("/");
  const indexPath = basePath + "/data/search_index.json";

  fetch(indexPath)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then((data) => {
      function runSearch() {
        const query = input.value.trim().toLowerCase();
        resultsContainer.innerHTML = "";

        if (!query || query.length < 3) return;

        const matched = data.filter(entry => {
          return (
            entry.title?.toLowerCase().includes(query) ||
            entry.description?.toLowerCase().includes(query) ||
            entry.keywords?.some(k => k.toLowerCase().includes(query)) ||
            entry.text?.toLowerCase().includes(query)
          );
        });

        if (matched.length === 0) {
          resultsContainer.innerHTML = "<p>No matches found.</p>";
          return;
        }

        matched.forEach(entry => {
          const div = document.createElement("div");
          div.classList.add("search-result");

          const queryTerms = query.split(/\s+/);
          const text = entry.text?.toLowerCase() || "";
          const foundTerms = queryTerms.filter(term => text.includes(term));
          const matchScore = Math.round((foundTerms.length / queryTerms.length) * 100);

          const density = (typeof entry.keyword_density === "number" && !isNaN(entry.keyword_density))
            ? `${(entry.keyword_density * 100).toFixed(1)}%`
            : "0.0%";

          div.innerHTML = `
            <h3><a href="${entry.path}" target="_blank">${entry.title}</a></h3>
            <p><strong>Description:</strong> ${entry.description || '—'}</p>
            <p><strong>Source:</strong> ${entry.source_note || '—'}</p>
            <p><strong>Keywords:</strong> ${entry.keywords?.join(", ") || '—'}</p>
            <p><strong>Excerpt:</strong> <em>${entry.text.substring(0, 80) || ''}...</em></p>

            <p><strong>Match score:</strong> ${matchScore}%, <strong>Density:</strong> ${density}</p>
            <hr>
          `;
          resultsContainer.appendChild(div);
        });
      }

      input.addEventListener("input", runSearch);
      input.addEventListener("keyup", (event) => {
        if (event.key === "Enter") {
          runSearch();
        }
      });
    })
    .catch((err) => {
      console.error("Failed to load search index:", err);
      resultsContainer.innerHTML = "<p style='color:red;'>Failed to load search index. Please try again later.</p>";
    });
});
