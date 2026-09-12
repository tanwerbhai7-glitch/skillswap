/* ==============================================================
   SkillSwap — Contact page logic
   ============================================================== */

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("contactForm");
  const nameInput = document.getElementById("cName");
  const emailInput = document.getElementById("cEmail");
  const messageInput = document.getElementById("cMessage");
  const submitBtn = document.getElementById("contactSubmitBtn");
  const successMsg = document.getElementById("contactSuccess");

  [nameInput, emailInput, messageInput].forEach((el) => el.addEventListener("input", () => SSUtil.clearFieldError(el)));

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    successMsg.hidden = true;

    const nameOk = SSUtil.validateField(nameInput, [SSUtil.rules.required]);
    const emailOk = SSUtil.validateField(emailInput, [SSUtil.rules.required, SSUtil.rules.email]);
    const messageOk = SSUtil.validateField(messageInput, [SSUtil.rules.required, SSUtil.rules.minLength(15)]);
    if (!nameOk || !emailOk || !messageOk) {
      SSUtil.toast("Please fix the highlighted fields.", "error");
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Sending…";
    setTimeout(() => {
      submitBtn.disabled = false;
      submitBtn.textContent = "Send message";
      successMsg.hidden = false;
      form.reset();
      SSUtil.toast("Message sent — thanks for reaching out!", "success");
    }, 600);
  });
});
