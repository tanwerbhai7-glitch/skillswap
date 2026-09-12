/* ==============================================================
   SkillSwap — Dashboard logic
   ============================================================== */

(function () {
  let user = null;
  let deleteTargetId = null;
  // Cache of the current user's skills so edit/delete button handlers
  // don't need another round trip just to look up a skill by id.
  let mySkillsCache = [];

  document.addEventListener("DOMContentLoaded", async () => {
    user = await SSLayout.requireAuth();
    if (!user) return;

    document.getElementById("dashLoading").hidden = true;
    document.getElementById("dashContent").hidden = false;
    wireTabs();
    await populateCategorySelect();
    await renderAll();
    wireSkillModal();
    wireDeleteModal();
    wireRequestButtons();
  });

  /* ---------- tabs ---------- */
  function wireTabs() {
    const links = document.querySelectorAll(".dash-side a");
    function activate(panelId) {
      links.forEach((l) => l.classList.toggle("is-active", l.dataset.panel === panelId));
      document.querySelectorAll(".dash-panel").forEach((p) => p.classList.toggle("is-active", p.id === `panel-${panelId}`));
    }
    links.forEach((l) =>
      l.addEventListener("click", (e) => {
        e.preventDefault();
        activate(l.dataset.panel);
        history.replaceState(null, "", `#${l.dataset.panel}`);
      })
    );
    const hash = window.location.hash.replace("#", "");
    if (hash) activate(hash);
  }

  async function populateCategorySelect() {
    const select = document.getElementById("skCategory");
    try {
      const categories = await SSData.Categories.list();
      select.innerHTML = categories.map((c) => `<option>${c.name}</option>`).join("");
    } catch (err) {
      select.innerHTML = `<option>Design</option><option>Development</option>`;
    }
  }

  /* ---------- render everything ---------- */
  async function renderAll() {
    await Promise.all([renderStats(), renderMySkills(), renderReceived(), renderSent(), renderRecentActivity()]);
  }

  async function renderStats() {
    try {
      const [mySkills, received, sent] = await Promise.all([
        SSData.Skills.byOwner(user.id),
        SSData.Requests.forOwner(user.id),
        SSData.Requests.byRequester(user.id),
      ]);
      const all = [...received, ...sent];
      document.getElementById("statMySkills").textContent = mySkills.length;
      document.getElementById("statPending").textContent = received.filter((r) => r.status === "pending").length;
      document.getElementById("statAccepted").textContent = all.filter((r) => r.status === "accepted").length;
      document.getElementById("statCompleted").textContent = all.filter((r) => r.status === "completed").length;
    } catch (err) {
      ["statMySkills", "statPending", "statAccepted", "statCompleted"].forEach((id) => (document.getElementById(id).textContent = "—"));
    }
  }

  async function renderRecentActivity() {
    const box = document.getElementById("recentActivity");
    try {
      const all = (await SSData.Requests.byUser(user.id))
        .slice()
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5);
      if (!all.length) {
        box.innerHTML = `<div class="state-block"><div class="state-block__icon">✨</div><p>No activity yet — browse skills to send your first request.</p><a href="browse.html" class="btn btn-primary btn-sm mt-1">Browse skills</a></div>`;
        return;
      }
      box.innerHTML = all
        .map((r) => {
          const direction = r.requesterId === user.id ? `You requested ${SSUtil.escapeHTML(r.skillTitle)} from ${SSUtil.escapeHTML(r.ownerName)}` : `${SSUtil.escapeHTML(r.requesterName)} requested your ${SSUtil.escapeHTML(r.skillTitle)}`;
          return `<div class="review">
            <div class="review__head"><span>${direction}</span><span>${SSUtil.timeAgo(r.createdAt)}</span></div>
            <span class="status status--${r.status}">${r.status}</span>
          </div>`;
        })
        .join("");
    } catch (err) {
      box.innerHTML = `<div class="state-block"><div class="state-block__icon">⚠️</div><p>Couldn't load recent activity.</p></div>`;
    }
  }

  /* ---------- my skills ---------- */
  async function renderMySkills() {
    const grid = document.getElementById("mySkillsGrid");
    try {
      mySkillsCache = await SSData.Skills.byOwner(user.id);
    } catch (err) {
      grid.innerHTML = `<div class="state-block"><div class="state-block__icon">⚠️</div><p>Couldn't load your listings.</p></div>`;
      return;
    }
    if (!mySkillsCache.length) {
      grid.innerHTML = `<div class="state-block"><div class="state-block__icon">🗂️</div><p>You haven't listed any skills yet.</p><button class="btn btn-primary btn-sm mt-1" id="emptyAddSkillBtn">Add your first skill</button></div>`;
      const btn = document.getElementById("emptyAddSkillBtn");
      if (btn) btn.addEventListener("click", () => openSkillModal());
      return;
    }
    grid.innerHTML = mySkillsCache.map(ownerTicketHTML).join("");
    grid.querySelectorAll("[data-edit]").forEach((btn) =>
      btn.addEventListener("click", () => {
        const skill = mySkillsCache.find((s) => s.id === btn.dataset.edit);
        openSkillModal(skill);
      })
    );
    grid.querySelectorAll("[data-delete]").forEach((btn) =>
      btn.addEventListener("click", () => {
        deleteTargetId = btn.dataset.delete;
        SSUtil.openModal(document.getElementById("deleteModal"));
      })
    );
  }

  function ownerTicketHTML(skill) {
    return `
      <article class="ticket">
        <div class="ticket__top">
          <span class="ticket__category">${SSUtil.escapeHTML(skill.category)}</span>
          <h3 class="ticket__title">${skill.image || "🔁"} ${SSUtil.escapeHTML(skill.title)}</h3>
        </div>
        <div class="ticket__tear"></div>
        <div class="ticket__body">
          <p class="ticket__desc">${SSUtil.escapeHTML(skill.description).slice(0, 90)}…</p>
          <div class="ticket__meta">
            <span class="tag tag--level">${SSUtil.escapeHTML(skill.level)}</span>
          </div>
        </div>
        <div class="ticket__footer">
          <button class="btn btn-sm btn-outline" data-edit="${skill.id}">Edit</button>
          <button class="btn btn-sm btn-danger" data-delete="${skill.id}">Delete</button>
        </div>
      </article>`;
  }

  function openSkillModal(skill) {
    const form = document.getElementById("skillForm");
    form.reset();
    document.querySelectorAll("#skillForm .field").forEach((f) => f.classList.remove("has-error"));
    document.getElementById("skillModalTitle").textContent = skill ? "Edit skill" : "Add a skill";
    document.getElementById("skillId").value = skill ? skill.id : "";
    document.getElementById("skTitle").value = skill ? skill.title : "";
    document.getElementById("skCategory").value = skill ? skill.category : document.getElementById("skCategory").options[0].value;
    document.getElementById("skLevel").value = skill ? skill.level : "Beginner";
    document.getElementById("skDescription").value = skill ? skill.description : "";
    document.getElementById("skWant").value = skill ? skill.wantInReturn || "" : "";
    document.getElementById("skTags").value = skill ? (skill.tags || []).join(", ") : "";
    SSUtil.openModal(document.getElementById("skillModal"));
  }

  function wireSkillModal() {
    const overlay = document.getElementById("skillModal");
    SSUtil.wireModalDismiss(overlay);
    document.getElementById("addSkillBtn").addEventListener("click", () => openSkillModal());

    document.getElementById("skillForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      const titleInput = document.getElementById("skTitle");
      const descInput = document.getElementById("skDescription");
      const titleOk = SSUtil.validateField(titleInput, [SSUtil.rules.required]);
      const descOk = SSUtil.validateField(descInput, [SSUtil.rules.required, SSUtil.rules.minLength(20)]);
      if (!titleOk || !descOk) return;

      const id = document.getElementById("skillId").value;
      const tags = document.getElementById("skTags").value.split(",").map((t) => t.trim()).filter(Boolean);
      const payload = {
        title: titleInput.value.trim(),
        category: document.getElementById("skCategory").value,
        level: document.getElementById("skLevel").value,
        description: descInput.value.trim(),
        wantInReturn: document.getElementById("skWant").value.trim(),
        tags,
      };

      const submitBtn = document.getElementById("skillSubmitBtn");
      submitBtn.disabled = true;
      submitBtn.textContent = "Saving…";

      try {
        if (id) {
          await SSData.Skills.update(id, payload);
          SSUtil.toast("Skill updated.", "success");
        } else {
          await SSData.Skills.create({
            ...payload,
            ownerId: user.id,
            ownerName: user.name,
            image: "🔁",
          });
          SSUtil.toast("Skill listed on the board!", "success");
        }
        SSUtil.closeModal(overlay);
        await renderAll();
      } catch (err) {
        SSUtil.toast(err.message || "Couldn't save that skill. Try again.", "error");
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "Save skill";
      }
    });
  }

  function wireDeleteModal() {
    const overlay = document.getElementById("deleteModal");
    SSUtil.wireModalDismiss(overlay);
    document.getElementById("confirmDeleteBtn").addEventListener("click", async () => {
      if (deleteTargetId) {
        try {
          await SSData.Skills.remove(deleteTargetId);
          SSUtil.toast("Listing removed.", "info");
        } catch (err) {
          SSUtil.toast(err.message || "Couldn't remove that listing.", "error");
        }
        deleteTargetId = null;
        await renderAll();
      }
      SSUtil.closeModal(overlay);
    });
  }

  /* ---------- requests ---------- */
  async function renderReceived() {
    const body = document.getElementById("receivedTableBody");
    let rows;
    try {
      rows = (await SSData.Requests.forOwner(user.id)).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } catch (err) {
      body.innerHTML = "";
      document.getElementById("receivedEmpty").hidden = false;
      return;
    }
    document.getElementById("receivedEmpty").hidden = rows.length > 0;
    body.innerHTML = rows
      .map(
        (r) => `<tr>
          <td>${SSUtil.escapeHTML(r.skillTitle)}</td>
          <td>${SSUtil.escapeHTML(r.requesterName)}</td>
          <td style="white-space:normal; max-width:220px;">${SSUtil.escapeHTML(r.message)}</td>
          <td><span class="status status--${r.status}">${r.status}</span></td>
          <td>
            ${r.status === "pending"
              ? `<button class="btn btn-sm btn-primary" data-accept="${r.id}">Accept</button>
                 <button class="btn btn-sm btn-outline" data-decline="${r.id}">Decline</button>`
              : r.status === "accepted"
              ? `<button class="btn btn-sm btn-accent" data-complete="${r.id}">Mark complete</button>`
              : `<span class="muted">—</span>`}
          </td>
        </tr>`
      )
      .join("");
  }

  async function renderSent() {
    const body = document.getElementById("sentTableBody");
    let rows;
    try {
      rows = (await SSData.Requests.byRequester(user.id)).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } catch (err) {
      body.innerHTML = "";
      document.getElementById("sentEmpty").hidden = false;
      return;
    }
    document.getElementById("sentEmpty").hidden = rows.length > 0;
    body.innerHTML = rows
      .map(
        (r) => `<tr>
          <td>${SSUtil.escapeHTML(r.skillTitle)}</td>
          <td>${SSUtil.escapeHTML(r.ownerName)}</td>
          <td style="white-space:normal; max-width:220px;">${SSUtil.escapeHTML(r.message)}</td>
          <td><span class="status status--${r.status}">${r.status}</span></td>
          <td>${r.status === "pending" ? `<button class="btn btn-sm btn-outline" data-cancel="${r.id}">Cancel</button>` : `<span class="muted">—</span>`}</td>
        </tr>`
      )
      .join("");
  }

  function wireRequestButtons() {
    document.body.addEventListener("click", async (e) => {
      const t = e.target;
      if (t.dataset.accept) await updateRequest(t.dataset.accept, "accepted", "Request accepted.");
      if (t.dataset.decline) await updateRequest(t.dataset.decline, "declined", "Request declined.");
      if (t.dataset.complete) await updateRequest(t.dataset.complete, "completed", "Swap marked complete!");
      if (t.dataset.cancel) {
        try {
          await SSData.Requests.remove(t.dataset.cancel);
          SSUtil.toast("Request cancelled.", "info");
        } catch (err) {
          SSUtil.toast(err.message || "Couldn't cancel that request.", "error");
        }
        await renderAll();
      }
    });
  }

  async function updateRequest(id, status, msg) {
    try {
      await SSData.Requests.updateStatus(id, status);
      SSUtil.toast(msg, "success");
    } catch (err) {
      SSUtil.toast(err.message || "Couldn't update that request.", "error");
    }
    await renderAll();
  }
})();
