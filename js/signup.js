/* ==============================================================
   SkillSwap — Signup page logic
   ============================================================== */

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("signupForm");
  const nameInput = document.getElementById("suName");
  const emailInput = document.getElementById("suEmail");
  const passInput = document.getElementById("suPassword");
  const confirmInput = document.getElementById("suConfirm");
  const termsInput = document.getElementById("suTerms");
  const submitBtn = document.getElementById("signupSubmitBtn");
  const strengthBar = document.getElementById("strengthBar");

  [nameInput, emailInput, passInput, confirmInput].forEach((el) =>
    el.addEventListener("input", () => SSUtil.clearFieldError(el))
  );
  termsInput.addEventListener("change", () => SSUtil.clearFieldError(termsInput));

  passInput.addEventListener("input", () => {
    const v = passInput.value;
    let score = 0;
    if (v.length >= 8) score++;
    if (/[A-Z]/.test(v)) score++;
    if (/[0-9]/.test(v)) score++;
    if (/[^A-Za-z0-9]/.test(v)) score++;
    const pct = (score / 4) * 100;
    const colors = ["#d65f45", "#d65f45", "#e0a333", "#1f6f5c", "#123f34"];
    strengthBar.style.width = `${pct}%`;
    strengthBar.style.background = colors[score];
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const nameOk = SSUtil.validateField(nameInput, [SSUtil.rules.required, SSUtil.rules.minLength(2)]);
    const emailOk = SSUtil.validateField(emailInput, [SSUtil.rules.required, SSUtil.rules.email]);
    const passOk = SSUtil.validateField(passInput, [SSUtil.rules.required, SSUtil.rules.password]);
    const confirmOk = SSUtil.validateField(confirmInput, [
      SSUtil.rules.required,
      SSUtil.rules.match(passInput.value),
    ]);
    let termsOk = true;
    if (!termsInput.checked) {
      termsInput.closest(".field").classList.add("has-error");
      termsOk = false;
    } else {
      termsInput.closest(".field").classList.remove("has-error");
    }

    if (!nameOk || !emailOk || !passOk || !confirmOk || !termsOk) return;

    submitBtn.disabled = true;
    submitBtn.textContent = "Creating account…";

    try {
      const user = await SSData.Users.signup({
        name: nameInput.value.trim(),
        email: emailInput.value.trim(),
        password: passInput.value,
      });
      SkillSwapDB.Session.set(user.id);
      SSUtil.toast("Account created — welcome to SkillSwap!", "success");
      setTimeout(() => (window.location.href = "profile.html"), 600);
    } catch (err) {
      const isDuplicate = /already exists/i.test(err.message || "");
      SSUtil.toast(err.message || "Couldn't create your account. Try again.", "error");
      if (isDuplicate) emailInput.closest(".field").classList.add("has-error");
      submitBtn.disabled = false;
      submitBtn.textContent = "Create account";
    }
  });
});
