/* ==============================================================
   SkillSwap — Shared Layout (navbar + footer), injected on every page
   ============================================================== */

(function () {
  const NAV_ITEMS = [
    { href: "index.html", label: "Home" },
    { href: "browse.html", label: "Browse Skills" },
    { href: "dashboard.html", label: "Dashboard" },
    { href: "about.html", label: "About" },
    { href: "contact.html", label: "Contact" },
  ];

  function currentFile() {
    const path = window.location.pathname.split("/").pop();
    return path === "" ? "index.html" : path;
  }

  function buildNavbar() {
    const mount = document.getElementById("site-navbar");
    if (!mount) return;
    const current = currentFile();
    const sessionPtr = SkillSwapDB.Session.get();
    // Render immediately from whatever's cached locally (instant, no flicker),
    // then refine in the background once SSData resolves the live record.
    const cachedUser = sessionPtr ? SkillSwapDB.Users.get(sessionPtr.userId) : null;

    renderNavShell(mount, current, cachedUser);

    if (sessionPtr) {
      SSData.Session.currentUser()
        .then((user) => {
          if (user) {
            renderAuthArea(user);
          } else {
            // Session pointer refers to a user that no longer exists anywhere.
            SkillSwapDB.Session.clear();
            renderAuthArea(null);
          }
        })
        .catch(() => {
          /* offline and nothing cached — keep whatever was already rendered */
        });
    }
  }

  function renderNavShell(mount, current, user) {
    const links = NAV_ITEMS.map(
      (item) =>
        `<li><a href="${item.href}" class="${item.href === current ? "is-active" : ""}">${item.label}</a></li>`
    ).join("");

    mount.innerHTML = `
      <nav class="navbar" aria-label="Main navigation">
        <div class="container navbar__inner">
          <a href="index.html" class="brand"><span class="brand__mark">⇄</span> SkillSwap</a>
          <button class="nav-toggle" id="navToggle" aria-label="Toggle menu" aria-expanded="false" aria-controls="navLinks"></button>
          <ul class="nav-links" id="navLinks">${links}</ul>
          <div class="nav-actions" id="navAuthArea"></div>
        </div>
      </nav>`;

    renderAuthArea(user);

    const toggle = document.getElementById("navToggle");
    const navLinks = document.getElementById("navLinks");
    toggle.addEventListener("click", () => {
      const open = navLinks.classList.toggle("is-open");
      toggle.classList.toggle("is-open", open);
      toggle.setAttribute("aria-expanded", String(open));
    });
    navLinks.querySelectorAll("a").forEach((a) =>
      a.addEventListener("click", () => {
        navLinks.classList.remove("is-open");
        toggle.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
      })
    );
  }

  function renderAuthArea(user) {
    const area = document.getElementById("navAuthArea");
    if (!area) return;
    area.innerHTML = user
      ? `<a href="profile.html" class="btn btn-ghost btn-sm">Hi, ${SSUtil.escapeHTML(user.name.split(" ")[0])}</a>
         <button class="avatar-btn" id="navAvatarBtn" title="${SSUtil.escapeHTML(user.name)}" aria-label="Account menu">${SSUtil.initials(user.name)}</button>`
      : `<a href="login.html" class="btn btn-ghost btn-sm">Log in</a>
         <a href="signup.html" class="btn btn-primary btn-sm">Sign up</a>`;

    const avatarBtn = document.getElementById("navAvatarBtn");
    if (avatarBtn) {
      avatarBtn.addEventListener("click", () => {
        if (confirm("Log out of SkillSwap?")) {
          SkillSwapDB.Session.clear();
          SSUtil.toast("You've been logged out.", "info");
          setTimeout(() => (window.location.href = "index.html"), 500);
        }
      });
    }
  }

  function buildFooter() {
    const mount = document.getElementById("site-footer");
    if (!mount) return;
    mount.innerHTML = `
      <footer class="footer">
        <div class="container footer__grid">
          <div>
            <a href="index.html" class="brand" style="color:#fff;"><span class="brand__mark">⇄</span> SkillSwap</a>
            <p style="margin-top:0.8rem; color:#cfe3dc; font-size:0.9rem; max-width:32ch;">
              A community marketplace for trading skills — no cash, just fair exchange.
            </p>
          </div>
          <div>
            <h4>Explore</h4>
            <ul>
              <li><a href="browse.html">Browse skills</a></li>
              <li><a href="signup.html">Offer a skill</a></li>
              <li><a href="dashboard.html">Your dashboard</a></li>
            </ul>
          </div>
          <div>
            <h4>Company</h4>
            <ul>
              <li><a href="about.html">About us</a></li>
              <li><a href="contact.html">Contact</a></li>
              
            </ul>
          </div>
          <div>
            <h4>Account</h4>
            <ul>
              <li><a href="login.html">Log in</a></li>
              <li><a href="signup.html">Sign up</a></li>
              <li><a href="profile.html">Profile</a></li>
            </ul>
          </div>
        </div>
        <div class="container footer__bottom">
          <span>© ${new Date().getFullYear()} SkillSwap. A community platform for sharing knowledge, finding mentors and exchanging practical skills.</span>
          <span>Built with HTML, CSS &amp; vanilla JS</span>
        </div>
      </footer>`;
  }

  async function requireAuth(redirectTo = "login.html") {
    const sessionPtr = SkillSwapDB.Session.get();
    if (!sessionPtr) {
      window.location.href = `${redirectTo}?next=${encodeURIComponent(window.location.pathname.split("/").pop())}`;
      return null;
    }
    const user = await SSData.Session.currentUser();
    if (!user) {
      window.location.href = `${redirectTo}?next=${encodeURIComponent(window.location.pathname.split("/").pop())}`;
      return null;
    }
    return user;
  }

  document.addEventListener("DOMContentLoaded", () => {
    buildNavbar();
    buildFooter();
    document.body.classList.add("page-enter");
  });

  window.SSLayout = { requireAuth, buildNavbar };
})();
