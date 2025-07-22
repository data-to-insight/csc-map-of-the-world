document.addEventListener("DOMContentLoaded", function () {
  fetch("data/search_index.json")
    .then((response) => response.json())
    .then((data) => {
      const resultsContainer = document.getElementById("search-results");
      const input = document.getElementById("search-query");

      function runSearch() {
        const query = input.value.trim().toLowerCase();
        resultsContainer.innerHTML = "";

        if (!query || query.length < 3) return;

        const matched = data.filter(entry => {
          return (
            entry.title.toLowerCase().includes(query) ||
            entry.description.toLowerCase().includes(query) ||
            entry.keywords.some(k => k.toLowerCase().includes(query)) ||
            entry.text.toLowerCase().includes(query)
          );
        });

        if (matched.length === 0) {
          resultsContainer.innerHTML = "<p>No matches found.</p>";
          return;
        }

        for (const entry of matched) {
          const div = document.createElement("div");
          div.classList.add("search-result");

          // Compute basic relevance score (number of query terms found in text)
          const queryTerms = query.split(/\s+/);
          const text = entry.text.toLowerCase();
          const foundTerms = queryTerms.filter(term => text.includes(term));
          const matchScore = Math.round((foundTerms.length / queryTerms.length) * 100);

          // Handle density display safely
          const density = (typeof entry.keyword_density === "number" && !isNaN(entry.keyword_density))
            ? `${(entry.keyword_density * 100).toFixed(1)}%`
            : "0.0%";

          div.innerHTML = `
            <h3><a href="${entry.path}" target="_blank">${entry.title}</a></h3>
            <p><strong>Description:</strong> ${entry.description || '—'}</p>
            <p><strong>Source:</strong> ${entry.source_note || '—'}</p>
            <p><strong>Keywords:</strong> ${entry.keywords.join(", ")}</p>
            <p><strong>Excerpt:</strong> <em>${entry.text.substring(0, 200)}...</em></p>
            <p><strong>Match score:</strong> ${matchScore}%, <strong>Density:</strong> ${density}</p>
            <hr>
          `;

      


          resultsContainer.appendChild(div);
        }
      }

      // Listen to changes as user types
      input.addEventListener("input", runSearch);

      // Also run search on Enter key
      input.addEventListener("keyup", function (event) {
        if (event.key === "Enter") {
          runSearch();
        }
      });
    });
});
