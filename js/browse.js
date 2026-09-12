/* ==============================================================
   SkillSwap — Browse page logic
   ============================================================== */

(function () {
  const state = { q: "", category: "All", level: "All", sort: "newest" };
  let categories = [];
  let searchToken = 0; // guards against out-of-order async responses overwriting newer results

  document.addEventListener("DOMContentLoaded", async () => {
    const urlCategory = SSUtil.qs("category");
    if (urlCategory) state.category = urlCategory;

    wireControls();
    showSkeleton();

    try {
      const cats = await SSData.Categories.list();
      categories = ["All", ...cats.map((c) => c.name)];
    } catch (err) {
      categories = ["All"];
    }
    renderChips();
    runSearch();
  });

  function wireControls() {
    const searchInput = document.getElementById("searchInput");
    const sortSelect = document.getElementById("sortSelect");
    const levelSelect = document.getElementById("levelSelect");
    const clearBtn = document.getElementById("clearFilters");
    const emptyClearBtn = document.getElementById("emptyClearBtn");

    searchInput.addEventListener(
      "input",
      SSUtil.debounce((e) => {
        state.q = e.target.value;
        runSearch();
      }, 220)
    );
    sortSelect.addEventListener("change", (e) => { state.sort = e.target.value; runSearch(); });
    levelSelect.addEventListener("change", (e) => { state.level = e.target.value; runSearch(); });
    [clearBtn, emptyClearBtn].forEach((btn) =>
      btn.addEventListener("click", () => {
        state.q = ""; state.category = "All"; state.level = "All"; state.sort = "newest";
        searchInput.value = ""; sortSelect.value = "newest"; levelSelect.value = "All";
        renderChips();
        runSearch();
      })
    );

    document.getElementById("filterForm").addEventListener("submit", (e) => e.preventDefault());
  }

  function renderChips() {
    const wrap = document.getElementById("categoryChips");
    wrap.innerHTML = categories
      .map((c) => `<button type="button" class="chip ${c === state.category ? "is-active" : ""}" data-cat="${SSUtil.escapeHTML(c)}">${SSUtil.escapeHTML(c)}</button>`)
      .join("");
    wrap.querySelectorAll(".chip").forEach((chip) =>
      chip.addEventListener("click", () => {
        state.category = chip.dataset.cat;
        renderChips();
        runSearch();
      })
    );
  }

  function showSkeleton() {
    const grid = document.getElementById("skillsGrid");
    document.getElementById("emptyState").hidden = true;
    grid.innerHTML = Array.from({ length: 6 })
      .map(() => `<div class="skeleton" style="height:230px;"></div>`)
      .join("");
    document.getElementById("resultCount").textContent = "Searching the board…";
  }

  async function runSearch() {
    const myToken = ++searchToken;
    showSkeleton();
    const grid = document.getElementById("skillsGrid");
    const empty = document.getElementById("emptyState");

    let results = [];
    try {
      results = await SSData.Skills.search(state);
    } catch (err) {
      if (myToken !== searchToken) return; // a newer search superseded this one
      grid.innerHTML = "";
      empty.hidden = false;
      document.getElementById("resultCount").textContent = "Couldn't load results — showing what's cached.";
      return;
    }

    if (myToken !== searchToken) return; // a newer search already started; drop this stale response

    document.getElementById("resultCount").textContent =
      `${results.length} skill${results.length === 1 ? "" : "s"} found`;

    if (!results.length) {
      grid.innerHTML = "";
      empty.hidden = false;
      return;
    }
    empty.hidden = true;
    grid.innerHTML = results.map(skillTicketHTML).join("");
  }
})();
