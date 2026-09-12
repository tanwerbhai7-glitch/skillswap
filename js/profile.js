/* ==============================================================
   SkillSwap — Profile page logic
   ============================================================== */

(function () {
  let user = null;

  document.addEventListener("DOMContentLoaded", async () => {
    user = await SSLayout.requireAuth();
    if (!user) return;

    document.getElementById("profileLoading").hidden = true;
    document.getElementById("profileContent").hidden = false;
    await render();
    wireEditModal();
  });

  async function render() {
    document.getElementById("profileAvatar").textContent = SSUtil.initials(user.name);
    document.getElementById("profileName").textContent = user.name;
    document.getElementById("profileLocation").textContent = user.location || "Location not set";
    document.getElementById("profileJoined").textContent = user.joined
      ? `Member since ${new Date(user.joined).toLocaleDateString(undefined, { month: "long", year: "numeric" })}`
      : "";
    document.getElementById("profileBio").textContent = user.bio || "No bio yet — tell the community about yourself.";

    document.getElementById("offeredTags").innerHTML =
      (user.skillsOffered || []).map((s) => `<span class="tag">${SSUtil.escapeHTML(s)}</span>`).join("") ||
      `<span class="muted">No offered skills listed yet.</span>`;
    document.getElementById("wantedTags").innerHTML =
      (user.skillsWanted || []).map((s) => `<span class="tag tag--level">${SSUtil.escapeHTML(s)}</span>`).join("") ||
      `<span class="muted">No wanted skills listed yet.</span>`;

    const reviewsGrid = document.getElementById("profileReviews");
    const skillsGrid = document.getElementById("profileSkillsGrid");
    reviewsGrid.innerHTML = `<div class="skeleton" style="height:60px;"></div>`;
    skillsGrid.innerHTML = Array.from({ length: 3 }).map(() => `<div class="skeleton" style="height:200px;"></div>`).join("");

    const [reviews, skills] = await Promise.all([
      SSData.Reviews.forOwner(user.id).catch(() => []),
      SSData.Skills.byOwner(user.id).catch(() => []),
    ]);

    reviewsGrid.innerHTML = reviews.length
      ? reviews
          .slice(0, 3)
          .map(
            (r) => `<div class="review">
              <div class="review__head"><span>${SSUtil.escapeHTML(r.authorName)}</span><span>${SSUtil.timeAgo(r.createdAt)}</span></div>
              <div class="stars">${SSUtil.stars(r.rating)}</div>
            </div>`
          )
          .join("")
      : `<p class="muted">No reviews yet.</p>`;

    skillsGrid.innerHTML = skills.length
      ? skills.map(skillTicketHTML).join("")
      : `<div class="state-block"><div class="state-block__icon">🗂️</div><p>You haven't listed any skills yet.</p><a href="dashboard.html#my-skills" class="btn btn-primary btn-sm mt-1">Add your first skill</a></div>`;
  }

  function wireEditModal() {
    const overlay = document.getElementById("editProfileModal");
    SSUtil.wireModalDismiss(overlay);

    document.getElementById("editProfileBtn").addEventListener("click", () => {
      document.getElementById("epName").value = user.name || "";
      document.getElementById("epLocation").value = user.location || "";
      document.getElementById("epBio").value = user.bio || "";
      document.getElementById("epOffered").value = (user.skillsOffered || []).join(", ");
      document.getElementById("epWanted").value = (user.skillsWanted || []).join(", ");
      SSUtil.openModal(overlay);
    });

    document.getElementById("editProfileForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      const nameInput = document.getElementById("epName");
      const valid = SSUtil.validateField(nameInput, [SSUtil.rules.required]);
      if (!valid) return;

      const toList = (v) => v.split(",").map((s) => s.trim()).filter(Boolean);
      const submitBtn = e.target.querySelector("button[type=submit]");
      submitBtn.disabled = true;
      submitBtn.textContent = "Saving…";

      try {
        user = await SSData.Users.update(user.id, {
          name: nameInput.value.trim(),
          location: document.getElementById("epLocation").value.trim(),
          bio: document.getElementById("epBio").value.trim(),
          skillsOffered: toList(document.getElementById("epOffered").value),
          skillsWanted: toList(document.getElementById("epWanted").value),
        });

        await render();
        SSUtil.closeModal(overlay);
        SSUtil.toast("Profile updated.", "success");
        SSLayout.buildNavbar();
      } catch (err) {
        SSUtil.toast(err.message || "Couldn't save your profile. Try again.", "error");
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "Save changes";
      }
    });
  }
})();
