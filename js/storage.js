/* ==============================================================
   SkillSwap — Data Layer (LocalStorage-backed)
   ------------------------------------------------------------
   Every repository object below exposes the same shape it would
   as a future REST client (list/get/create/update/remove), so
   Phase 3 can swap the body of each method for a fetch() call
   without touching any page code that calls SkillSwapDB.*
   ============================================================== */

const SkillSwapDB = (() => {
  const KEYS = {
    users: "ss_users",
    skills: "ss_skills",
    requests: "ss_requests",
    reviews: "ss_reviews",
    categories: "ss_categories",
    session: "ss_session",
    seeded: "ss_seeded_v2",
  };

  /* ---------- low level helpers ---------- */
  function read(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      console.error("SkillSwapDB read error", key, e);
      return fallback;
    }
  }
  function write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.error("SkillSwapDB write error", key, e);
      return false;
    }
  }
  function uid(prefix) {
    return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
  }
  function nowISO() { return new Date().toISOString(); }

  /* ---------- generic CRUD factory ---------- */
  function makeRepo(key, idPrefix) {
    return {
      list() { return read(key, []); },
      get(id) { return read(key, []).find((r) => r.id === id) || null; },
      create(data) {
        const rows = read(key, []);
        const record = { id: uid(idPrefix), createdAt: nowISO(), ...data };
        rows.unshift(record);
        write(key, rows);
        return record;
      },
      update(id, patch) {
        const rows = read(key, []);
        const idx = rows.findIndex((r) => r.id === id);
        if (idx === -1) return null;
        rows[idx] = { ...rows[idx], ...patch, updatedAt: nowISO() };
        write(key, rows);
        return rows[idx];
      },
      remove(id) {
        const rows = read(key, []);
        const next = rows.filter((r) => r.id !== id);
        write(key, next);
        return next.length !== rows.length;
      },
      /**
       * Insert-or-update a record at a specific id (rather than
       * generating a new one). Used by the API data-service layer
       * (js/dataService.js) to mirror backend records into
       * localStorage as an offline cache — it does not change how
       * this repo behaves for anything already using create/update.
       */
      upsert(id, data) {
        const rows = read(key, []);
        const idx = rows.findIndex((r) => r.id === id);
        if (idx === -1) {
          rows.unshift({ id, createdAt: nowISO(), ...data, id });
        } else {
          rows[idx] = { ...rows[idx], ...data, id };
        }
        write(key, rows);
        return rows[idx === -1 ? 0 : idx];
      },
      replaceAll(rows) { write(key, rows); },
    };
  }

  const Users = makeRepo(KEYS.users, "usr");
  const Skills = makeRepo(KEYS.skills, "skl");
  const Requests = makeRepo(KEYS.requests, "req");
  const Reviews = makeRepo(KEYS.reviews, "rev");

  Users.findByEmail = (email) =>
    read(KEYS.users, []).find((u) => u.email.toLowerCase() === String(email).toLowerCase()) || null;

  Skills.byOwner = (userId) => read(KEYS.skills, []).filter((s) => s.ownerId === userId);
  Skills.search = ({ q = "", category = "All", level = "All", sort = "newest" } = {}) => {
    let rows = read(KEYS.skills, []);
    if (q.trim()) {
      const needle = q.trim().toLowerCase();
      rows = rows.filter(
        (s) =>
          s.title.toLowerCase().includes(needle) ||
          s.description.toLowerCase().includes(needle) ||
          s.ownerName.toLowerCase().includes(needle) ||
          (s.tags || []).some((t) => t.toLowerCase().includes(needle))
      );
    }
    if (category && category !== "All") rows = rows.filter((s) => s.category === category);
    if (level && level !== "All") rows = rows.filter((s) => s.level === level);
    switch (sort) {
      case "rating":
        rows = [...rows].sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case "az":
        rows = [...rows].sort((a, b) => a.title.localeCompare(b.title));
        break;
      case "oldest":
        rows = [...rows].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        break;
      case "newest":
      default:
        rows = [...rows].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
    return rows;
  };

  Requests.byUser = (userId) =>
    read(KEYS.requests, []).filter((r) => r.requesterId === userId || r.ownerId === userId);
  Requests.forOwner = (ownerId) => read(KEYS.requests, []).filter((r) => r.ownerId === ownerId);
  Requests.byRequester = (requesterId) => read(KEYS.requests, []).filter((r) => r.requesterId === requesterId);

  Reviews.forSkill = (skillId) => read(KEYS.reviews, []).filter((r) => r.skillId === skillId);
  Reviews.forOwner = (ownerId) => read(KEYS.reviews, []).filter((r) => r.ownerId === ownerId);

  const Categories = {
    list() { return read(KEYS.categories, []); },
  };

  /* ---------- session ---------- */
  const Session = {
    get() { return read(KEYS.session, null); },
    set(userId) { write(KEYS.session, { userId, loginAt: nowISO() }); },
    clear() { localStorage.removeItem(KEYS.session); },
    currentUser() {
      const s = read(KEYS.session, null);
      if (!s) return null;
      return Users.get(s.userId);
    },
  };

  /* ---------- initialize only the public categories ----------
     No users, skills, requests, reviews or sample credentials are
     created here. Real records come from the API or from actions
     performed by the current user. */
  function clearLegacyDemoData() {
    // One-time migration for older versions that shipped sample records.
    const legacyIds = ["usr_demo1","usr_demo2","usr_demo3","usr_demo4","usr_demo5"];
    const users = read(KEYS.users, []);
    const skills = read(KEYS.skills, []);
    const requests = read(KEYS.requests, []);
    const reviews = read(KEYS.reviews, []);

    const hasLegacy = users.some(u => legacyIds.includes(u.id)) ||
      skills.some(s => legacyIds.includes(s.ownerId)) ||
      requests.some(r => legacyIds.includes(r.ownerId) || legacyIds.includes(r.requesterId)) ||
      reviews.some(r => legacyIds.includes(r.ownerId));

    if (hasLegacy) {
      write(KEYS.users, users.filter(u => !legacyIds.includes(u.id)));
      write(KEYS.skills, skills.filter(s => !legacyIds.includes(s.ownerId)));
      write(KEYS.requests, requests.filter(r => !legacyIds.includes(r.ownerId) && !legacyIds.includes(r.requesterId)));
      write(KEYS.reviews, reviews.filter(r => !legacyIds.includes(r.ownerId)));
      const session = read(KEYS.session, null);
      if (session && legacyIds.includes(session.userId)) localStorage.removeItem(KEYS.session);
    }
  }

  function seed() {
    const categories = [
      { name: "Design", icon: "🎨" },
      { name: "Development", icon: "💻" },
      { name: "Music", icon: "🎸" },
      { name: "Language", icon: "🗣️" },
      { name: "Cooking", icon: "🍳" },
      { name: "Fitness", icon: "🏋️" },
      { name: "Photography", icon: "📷" },
      { name: "Business", icon: "📈" },
    ];
    if (!read(KEYS.categories, null)?.length) write(KEYS.categories, categories);
    write(KEYS.seeded, true);
  }

  clearLegacyDemoData();
  seed();

  return { Users, Skills, Requests, Reviews, Categories, Session, KEYS, uid, nowISO };
})();
