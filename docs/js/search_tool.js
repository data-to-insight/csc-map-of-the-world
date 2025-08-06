
// Revised to fit optimised document index, new json element key:value structure
document.addEventListener("DOMContentLoaded", function () {
  const input = document.getElementById("search-query");
  const resultsContainer = document.getElementById("search-results");

  if (!input || !resultsContainer) {
    console.warn("Search input or results container not found");
    return;
  }

  const pathParts = window.location.pathname.split("/");
  const basePath = "/" + pathParts.slice(1, pathParts.indexOf("csc-map-of-the-world") + 1).join("/");
  const indexPath = basePath + "/data/search_index.json";

  fetch(indexPath)
    .then(response => {
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return response.json();
    })
    .then(data => {
      // Utility to decode HTML entities and Unicode escapes
      const decode = str =>
        new DOMParser().parseFromString(str || "", 'text/html').body.textContent || "";

      // Prioritise matching keywords, then randomly sample the rest
      function sampleRelevantKeywords(keywords, query, limit = 20) {
        if (!Array.isArray(keywords)) return [];
        const q = query.toLowerCase();
        const matched = keywords.filter(k => k.toLowerCase().includes(q));
        const unmatched = keywords.filter(k => !k.toLowerCase().includes(q));
        const shuffledUnmatched = unmatched.sort(() => 0.5 - Math.random());
        return [...matched, ...shuffledUnmatched].slice(0, limit);
      }

      function runSearch() {
        const query = input.value.trim().toLowerCase();
        resultsContainer.innerHTML = "";

        if (!query || query.length < 3) return;

        const matched = data.filter(entry =>
          entry.name?.toLowerCase().includes(query) ||
          entry.excerpt?.toLowerCase().includes(query) ||
          entry.keywords?.some(k => k.toLowerCase().includes(query))
        );

        if (matched.length === 0) {
          resultsContainer.innerHTML = "<p>No matches found.</p>";
          return;
        }

        matched.forEach(entry => {
          const div = document.createElement("div");
          div.classList.add("search-result");

          const keywordSample = sampleRelevantKeywords(entry.keywords, query);
          const cleanExcerpt = decode(entry.excerpt || "");

          div.innerHTML = `
            <h3><a href="${entry.url || '#'}" target="_blank">${entry.name}</a></h3>
            <p><strong>Excerpt:</strong> ${cleanExcerpt || '—'}</p>
            <p><strong>Keywords:</strong> ${keywordSample.join(", ") || '—'}</p>
          `;

          resultsContainer.appendChild(div);
        });
      }

      input.addEventListener("input", runSearch);
      input.addEventListener("keyup", (event) => {
        if (event.key === "Enter") runSearch();
      });
    })
    .catch(err => {
      console.error("Failed to load search index:", err);
      resultsContainer.innerHTML = "<p style='color:red;'>Failed to load search index. Please try again later.</p>";
    });
});
