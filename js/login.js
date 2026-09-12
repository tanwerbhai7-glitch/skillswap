/* ==============================================================
   SkillSwap — Login page logic
   ============================================================== */

document.addEventListener("DOMContentLoaded", async () => {
  const existing = await SSData.Session.currentUser().catch(() => null);
  if (existing) {
    SSUtil.toast("You're already logged in.", "info");
  }

  const form = document.getElementById("loginForm");
  const emailInput = document.getElementById("loginEmail");
  const passwordInput = document.getElementById("loginPassword");
  const submitBtn = document.getElementById("loginSubmitBtn");

  [emailInput, passwordInput].forEach((el) => el.addEventListener("input", () => SSUtil.clearFieldError(el)));

  document.getElementById("fillDemoBtn").addEventListener("click", (e) => {
    e.preventDefault();
    emailInput.value = "ava@example.com";
    passwordInput.value = "Password1";
    SSUtil.toast("Demo credentials filled in.", "info", 2200);
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const emailOk = SSUtil.validateField(emailInput, [SSUtil.rules.required, SSUtil.rules.email]);
    const passOk = SSUtil.validateField(passwordInput, [SSUtil.rules.required]);
    if (!emailOk || !passOk) return;

    submitBtn.disabled = true;
    submitBtn.textContent = "Logging in…";

    try {
      const user = await SSData.Users.login(emailInput.value.trim(), passwordInput.value);
      SkillSwapDB.Session.set(user.id);
      SSUtil.toast(`Welcome back, ${user.name.split(" ")[0]}!`, "success");
      const next = SSUtil.qs("next");
      setTimeout(() => (window.location.href = next || "dashboard.html"), 500);
    } catch (err) {
      SSUtil.toast(err.message || "Incorrect email or password.", "error");
      submitBtn.disabled = false;
      submitBtn.textContent = "Log in";
    }
  });
});
