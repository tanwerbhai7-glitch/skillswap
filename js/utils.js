/* ==============================================================
   SkillSwap — Shared Utilities
   ============================================================== */

const SSUtil = (() => {
  /* ---------- toasts ---------- */
  function ensureStack() {
    let stack = document.querySelector(".toast-stack");
    if (!stack) {
      stack = document.createElement("div");
      stack.className = "toast-stack";
      stack.setAttribute("aria-live", "polite");
      stack.setAttribute("aria-atomic", "true");
      document.body.appendChild(stack);
    }
    return stack;
  }

  function toast(message, type = "info", duration = 3800) {
    const stack = ensureStack();
    const el = document.createElement("div");
    el.className = `toast toast--${type}`;
    el.setAttribute("role", "status");
    const icon = { success: "✓", error: "!", info: "•" }[type] || "•";
    el.innerHTML = `<strong>${icon}</strong><span>${escapeHTML(message)}</span><button type="button" aria-label="Dismiss notification">×</button>`;
    el.querySelector("button").addEventListener("click", () => el.remove());
    stack.appendChild(el);
    if (duration) setTimeout(() => el.remove(), duration);
    return el;
  }

  /* ---------- modal ---------- */
  function openModal(overlayEl) {
    overlayEl.classList.add("is-open");
    document.body.style.overflow = "hidden";
    const focusable = overlayEl.querySelector("input, select, textarea, button");
    if (focusable) focusable.focus();
  }
  function closeModal(overlayEl) {
    overlayEl.classList.remove("is-open");
    document.body.style.overflow = "";
  }
  function wireModalDismiss(overlayEl) {
    overlayEl.addEventListener("click", (e) => {
      if (e.target === overlayEl) closeModal(overlayEl);
    });
    overlayEl.querySelectorAll("[data-modal-close]").forEach((btn) =>
      btn.addEventListener("click", () => closeModal(overlayEl))
    );
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && overlayEl.classList.contains("is-open")) closeModal(overlayEl);
    });
  }

  /* ---------- validation ---------- */
  const rules = {
    required: (v) => v.trim().length > 0 || "This field is required.",
    email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || "Enter a valid email address.",
    minLength: (n) => (v) => v.trim().length >= n || `Must be at least ${n} characters.`,
    password: (v) =>
      (v.length >= 8 && /[A-Za-z]/.test(v) && /[0-9]/.test(v)) ||
      "Password needs at least 8 characters, with a letter and a number.",
    match: (otherVal) => (v) => v === otherVal || "Values don't match.",
  };

  function validateField(inputEl, validators) {
    const field = inputEl.closest(".field");
    const value = inputEl.value || "";
    for (const validator of validators) {
      const result = validator(value);
      if (result !== true) {
        field.classList.add("has-error");
        const errEl = field.querySelector(".error-text");
        if (errEl) errEl.textContent = result;
        return false;
      }
    }
    field.classList.remove("has-error");
    return true;
  }

  function clearFieldError(inputEl) {
    const field = inputEl.closest(".field");
    if (field) field.classList.remove("has-error");
  }

  /* ---------- misc ---------- */
  function escapeHTML(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  function initials(name) {
    return String(name).trim().split(/\s+/).slice(0, 2).map((n) => n[0]?.toUpperCase() || "").join("");
  }

  function timeAgo(iso) {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 30) return `${days}d ago`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months}mo ago`;
    return `${Math.floor(months / 12)}y ago`;
  }

  function debounce(fn, wait = 250) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), wait);
    };
  }

  function qs(params) {
    const usp = new URLSearchParams(window.location.search);
    return params ? usp.get(params) : usp;
  }

  function stars(rating) {
    const full = Math.round(rating || 0);
    return "★".repeat(full) + "☆".repeat(5 - full);
  }

  return {
    toast, openModal, closeModal, wireModalDismiss,
    rules, validateField, clearFieldError,
    escapeHTML, initials, timeAgo, debounce, qs, stars,
  };
})();
