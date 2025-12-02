// Minimal search for search_index.json (docs array)
// Uses: name, excerpt, keywords (fallback: tags)
// Works on mkdocs serve and GH Pages


// wrap & guard (removed)
// (function () {
//   const input   = document.getElementById('search-input');
//   const results = document.getElementById('search-results');
//   // quiet 'Search input or results container not found'
//   if (!input || !results) return;   // silent skip on pages without search UI

//   document.addEventListener("DOMContentLoaded", function () {
//     const input = document.getElementById("search-query");
//     const resultsContainer = document.getElementById("search-results");

//     if (!input || !resultsContainer) {
//       console.warn("Search input or results container not found");
//       return;
//     }

// remove pre DOMContentLoaded guard as blocking search
(function () {
  document.addEventListener("DOMContentLoaded", function () {
    const input = document.getElementById("search-query");
    const resultsContainer = document.getElementById("search-results");

    if (!input || !resultsContainer) {
      console.warn("Search input or results container not found");
      return;
    }

    // Resolve base for both local mkdocs and GH Pages
    const SITE_BASE = location.pathname.includes("/csc-map-of-the-world/")
      ? "/csc-map-of-the-world"
      : "";

    // Cache-bust so you don’t see stale data
    const v = String(Date.now());
    const INDEX_URL = `${SITE_BASE}/data/search_index.json?v=${v}`;

    // Simple helpers
    const decode = (str) =>
      new DOMParser().parseFromString(str || "", "text/html").body.textContent || "";
    const snippet = (s, n = 240) => {
      const clean = decode(s || "").replace(/\s+/g, " ").trim();
      return clean.length > n ? clean.slice(0, n - 1) + "…" : clean;
    };

    fetch(INDEX_URL, { cache: "no-store" })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        const docs = Array.isArray(data)
          ? data
          : (data.index || data.items || data.docs || []);

        if (!Array.isArray(docs)) {
          throw new Error("Unexpected search_index.json shape (not an array).");
        }

        // One-time debug so you can verify fields quickly in DevTools
        if (!window.__search_idx_debug__) {
          window.__search_idx_debug__ = true;
          console.log("[search] Loaded docs:", docs.length);
          console.log("[search] Sample doc:", docs[0]);
          console.log("[search] URL used:", INDEX_URL);
        }

        function runSearch() {
          const q = (input.value || "").trim().toLowerCase();
          resultsContainer.innerHTML = "";
          if (q.length < 3) return;

          const tokens = q.split(/\s+/).filter(Boolean);

          // Match if all tokens found in name/excerpt/keywords
          const matched = docs.filter((d) => {
            const name = (d.name || d.title || d.label || d.doc_id || "").toLowerCase();
            const excerpt = (d.excerpt || d.summary || "").toLowerCase();
            const kws = (Array.isArray(d.keywords) ? d.keywords : (Array.isArray(d.tags) ? d.tags : []))
              .join(" ")
              .toLowerCase();

            const hay = `${name}\n${excerpt}\n${kws}`;
            return tokens.every((t) => hay.includes(t));
          });

          if (!matched.length) {
            resultsContainer.innerHTML = "<p>No matches found.</p>";
            return;
          }

          // Naive ranking: name hit first, then shorter names
          matched.sort((a, b) => {
            const an = (a.name || "").toLowerCase().includes(tokens[0]) ? 0 : 1;
            const bn = (b.name || "").toLowerCase().includes(tokens[0]) ? 0 : 1;
            if (an !== bn) return an - bn;
            return (a.name || "").length - (b.name || "").length;
          });

          matched.slice(0, 50).forEach((d) => {
            const name = d.name || d.title || d.label || d.doc_id || "(untitled)";
            const excerpt = d.excerpt || d.summary || "";
            const keywords = Array.isArray(d.keywords)
              ? d.keywords
              : (Array.isArray(d.tags) ? d.tags : []);

            // If url empty, just don’t link (or decide a sensible default)
            const url = d.url && String(d.url).trim()
              ? ( /^https?:\/\//i.test(d.url) ? d.url : `${SITE_BASE}/${String(d.url).replace(/^\/+/, "")}` )
              : "#";

            const el = document.createElement("div");
            el.className = "search-result";
            el.style.padding = "10px 0";
            el.style.borderBottom = "1px solid #eee";

            el.innerHTML = `
              <h3 style="margin:.25rem 0;">
                ${url !== "#" ? `<a href="${url}" target="_blank" rel="noopener">${name}</a>` : name}
              </h3>
              <p style="margin:.25rem 0;"><strong>Excerpt:</strong> ${snippet(excerpt) || "—"}</p>
              <p style="margin:.25rem 0;"><strong>Keywords:</strong> ${
                (keywords && keywords.length) ? keywords.slice(0, 20).join(", ") : "—"
              }</p>
            `;
            resultsContainer.appendChild(el);
          });
        }

        input.addEventListener("input", runSearch);
        input.addEventListener("keyup", (e) => { if (e.key === "Enter") runSearch(); });
      })
      .catch((err) => {
        console.error("Failed to load search index:", err);
        resultsContainer.innerHTML = "<p style='color:red;'>Failed to load search index. Please try again later.</p>";
      });
  });

})();