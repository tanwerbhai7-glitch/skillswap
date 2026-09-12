/* ==============================================================
   SkillSwap — Skill Details page logic
   ============================================================== */

(function () {
  let skill = null;

  document.addEventListener("DOMContentLoaded", async () => {
    const id = SSUtil.qs("id");
    try {
      skill = id ? await SSData.Skills.get(id) : null;
    } catch (err) {
      skill = null;
    }

    if (!skill) {
      document.getElementById("detailContent").innerHTML = "";
      document.getElementById("notFoundState").hidden = false;
      return;
    }
    await render();
    wireModal();
  });

  async function render() {
    document.title = `${skill.title} — SkillSwap`;
    document.getElementById("crumbTitle").textContent = skill.title;

    const [owner, reviews, currentUser] = await Promise.all([
      SSData.Users.get(skill.ownerId).catch(() => null),
      SSData.Reviews.forSkill(skill.id).catch(() => []),
      SSData.Session.currentUser().catch(() => null),
    ]);
    const isOwner = currentUser && currentUser.id === skill.ownerId;

    document.getElementById("detailContent").innerHTML = `
      <div class="detail-head mb-2">
        <div>
          <span class="tag">${SSUtil.escapeHTML(skill.category)}</span>
          <h1 style="margin-top:0.5rem;">${skill.image || "🔁"} ${SSUtil.escapeHTML(skill.title)}</h1>
          <div class="flex gap-sm flex-wrap" style="align-items:center;">
            <span class="tag tag--level">${SSUtil.escapeHTML(skill.level)}</span>
            <span class="ticket__rating">${SSUtil.stars(skill.rating || 0)} <span class="muted">(${skill.ratingCount || 0} reviews)</span></span>
          </div>
        </div>
        ${isOwner ? `<div class="flex gap-sm"><a href="dashboard.html#my-skills" class="btn btn-outline btn-sm">Manage this listing</a></div>` : ""}
      </div>

      <div class="detail-grid">
        <div>
          <div class="card mb-2">
            <h3 class="mt-0">About this swap</h3>
            <p>${SSUtil.escapeHTML(skill.description)}</p>
            <div class="divider"></div>
            <h4>Looking to trade for</h4>
            <p class="muted">${SSUtil.escapeHTML(skill.wantInReturn || "Open to offers")}</p>
            <div class="flex gap-sm flex-wrap mt-1">
              ${(skill.tags || []).map((t) => `<span class="tag">#${SSUtil.escapeHTML(t)}</span>`).join("")}
            </div>
          </div>

          <div class="card">
            <h3 class="mt-0">Reviews (${reviews.length})</h3>
            <div id="reviewsList">
              ${reviews.length
                ? reviews.map(
                    (r) => `<div class="review">
                      <div class="review__head"><span>${SSUtil.escapeHTML(r.authorName)}</span><span>${SSUtil.timeAgo(r.createdAt)}</span></div>
                      <div class="stars">${SSUtil.stars(r.rating)}</div>
                      <p class="mt-0" style="margin-top:0.3rem;">${SSUtil.escapeHTML(r.comment)}</p>
                    </div>`
                  ).join("")
                : `<p class="muted">No reviews yet — be the first after a swap.</p>`}
            </div>
          </div>
        </div>

        <aside class="sticky-panel">
          <div class="card mb-2">
            <div class="provider-card mb-2">
              <div class="avatar">${SSUtil.initials(owner ? owner.name : skill.ownerName)}</div>
              <div>
                <div style="font-weight:700;">${SSUtil.escapeHTML(skill.ownerName)}</div>
                <div class="muted" style="font-size:0.85rem;">${owner ? SSUtil.escapeHTML(owner.location || "") : ""}</div>
              </div>
            </div>
            ${owner ? `<p class="muted" style="font-size:0.9rem;">${SSUtil.escapeHTML(owner.bio || "")}</p>` : ""}
            ${isOwner
              ? `<p class="muted" style="font-size:0.85rem;">This is your listing — manage it from the dashboard.</p>`
              : `<button class="btn btn-primary btn-block" id="openRequestBtn">Request this swap</button>`}
          </div>
        </aside>
      </div>`;
  }

  function wireModal() {
    const overlay = document.getElementById("requestModal");
    SSUtil.wireModalDismiss(overlay);
    const openBtn = document.getElementById("openRequestBtn");
    if (openBtn) {
      openBtn.addEventListener("click", async () => {
        const user = await SSData.Session.currentUser().catch(() => null);
        if (!user) {
          SSUtil.toast("Log in to request a swap.", "info");
          window.location.href = `login.html?next=skill-details.html?id=${skill.id}`;
          return;
        }
        SSUtil.openModal(overlay);
      });
    }

    document.getElementById("requestForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      const input = document.getElementById("reqMessage");
      const valid = SSUtil.validateField(input, [SSUtil.rules.required, SSUtil.rules.minLength(10)]);
      if (!valid) return;

      const user = await SSData.Session.currentUser().catch(() => null);
      if (!user) {
        SSUtil.toast("Log in to request a swap.", "info");
        return;
      }

      const submitBtn = document.querySelector("#requestForm button[type=submit]");
      submitBtn.disabled = true;
      submitBtn.textContent = "Sending…";

      try {
        await SSData.Requests.create({
          skillId: skill.id,
          requesterId: user.id,
          requesterName: user.name,
          message: input.value.trim(),
        });
        SSUtil.closeModal(overlay);
        document.getElementById("requestForm").reset();
        SSUtil.toast("Swap request sent! Track it from your dashboard.", "success");
      } catch (err) {
        SSUtil.toast(err.message || "Couldn't send that request. Try again.", "error");
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "Send request";
      }
    });
  }
})();
