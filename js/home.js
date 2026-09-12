/* ==============================================================
   SkillSwap — Home page logic
   ============================================================== */

document.addEventListener("DOMContentLoaded", () => {
  renderStats();
  renderCategories();
  renderFeatured();
  renderTestimonials();
});

async function renderStats() {
  try {
    const [skills, users, requests] = await Promise.all([
      SSData.Skills.list(),
      SSData.Users.list(),
      SSData.Requests.list(),
    ]);
    const completed = requests.filter((r) => r.status === "completed");
    document.getElementById("statSkills").textContent = skills.length;
    document.getElementById("statUsers").textContent = users.length;
    document.getElementById("statSwaps").textContent = completed.length;
  } catch (err) {
    document.getElementById("statSkills").textContent = "—";
    document.getElementById("statUsers").textContent = "—";
    document.getElementById("statSwaps").textContent = "—";
  }
}

async function renderCategories() {
  const grid = document.getElementById("categoryGrid");
  grid.innerHTML = Array.from({ length: 8 }).map(() => `<div class="skeleton" style="height:100px;"></div>`).join("");
  try {
    const [categories, skills] = await Promise.all([SSData.Categories.list(), SSData.Skills.list()]);
    grid.innerHTML = categories
      .map((c) => {
        const count = c.skillCount !== undefined ? c.skillCount : skills.filter((s) => s.category === c.name).length;
        return `<a class="cat-card" href="browse.html?category=${encodeURIComponent(c.name)}">
          <div class="cat-card__icon">${c.icon}</div>
          <div>${c.name}</div>
          <div class="cat-card__count">${count} listing${count === 1 ? "" : "s"}</div>
        </a>`;
      })
      .join("");
  } catch (err) {
    grid.innerHTML = `<div class="state-block"><div class="state-block__icon">⚠️</div><p>Couldn't load categories right now.</p></div>`;
  }
}

async function renderFeatured() {
  const grid = document.getElementById("featuredGrid");
  grid.innerHTML = Array.from({ length: 6 }).map(() => `<div class="skeleton" style="height:230px;"></div>`).join("");
  try {
    const featured = (await SSData.Skills.search({ sort: "rating" })).slice(0, 6);
    if (!featured.length) {
      grid.innerHTML = `<div class="state-block"><div class="state-block__icon">🗂️</div><p>No skills listed yet. Be the first!</p></div>`;
      return;
    }
    grid.innerHTML = featured.map(skillTicketHTML).join("");
  } catch (err) {
    grid.innerHTML = `<div class="state-block"><div class="state-block__icon">⚠️</div><p>Couldn't load featured skills right now.</p></div>`;
  }
}

async function renderTestimonials() {
  const grid = document.getElementById("testimonialGrid");
  try {
    const reviews = (await SSData.Reviews.list()).slice(0, 3);
    if (!reviews.length) {
      grid.innerHTML = `<p class="muted center">No reviews yet.</p>`;
      return;
    }
    grid.innerHTML = reviews
      .map(
        (r) => `<div class="card quote-card">
          <div class="stars">${SSUtil.stars(r.rating)}</div>
          <p>"${SSUtil.escapeHTML(r.comment)}"</p>
          <div class="quote-card__who">${SSUtil.escapeHTML(r.authorName)}</div>
        </div>`
      )
      .join("");
  } catch (err) {
    grid.innerHTML = `<p class="muted center">Couldn't load testimonials right now.</p>`;
  }
}
