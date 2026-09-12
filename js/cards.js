/* ==============================================================
   SkillSwap — Shared card renderer
   ============================================================== */

function skillTicketHTML(skill) {
  return `
    <article class="ticket">
      <div class="ticket__top">
        <span class="ticket__category">${SSUtil.escapeHTML(skill.category)}</span>
        <h3 class="ticket__title"><a href="skill-details.html?id=${skill.id}" style="color:inherit; text-decoration:none;">${skill.image || "🔁"} ${SSUtil.escapeHTML(skill.title)}</a></h3>
        <div class="ticket__user"><span class="dot"></span> ${SSUtil.escapeHTML(skill.ownerName)}</div>
      </div>
      <div class="ticket__tear"></div>
      <div class="ticket__body">
        <p class="ticket__desc">${SSUtil.escapeHTML(skill.description).slice(0, 100)}${skill.description.length > 100 ? "…" : ""}</p>
        <div class="ticket__meta">
          <span class="tag tag--level">${SSUtil.escapeHTML(skill.level)}</span>
          <span class="tag">wants: ${SSUtil.escapeHTML((skill.wantInReturn || "open to offers").split(" or ")[0])}</span>
        </div>
      </div>
      <div class="ticket__footer">
        <span class="ticket__rating">${SSUtil.stars(skill.rating || 0)} <span class="muted">(${skill.ratingCount || 0})</span></span>
        <a href="skill-details.html?id=${skill.id}" class="btn btn-sm btn-outline">View</a>
      </div>
    </article>`;
}
