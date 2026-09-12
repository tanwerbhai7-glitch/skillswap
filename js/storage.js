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

  /* ---------- seed mock data (first run only) ---------- */
  function seed() {
    if (read(KEYS.seeded, false)) return;

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
    write(KEYS.categories, categories);

    const users = [
      { id: "usr_demo1", name: "Ava Torres", email: "ava@example.com", password: "Password1", bio: "UX designer who trades Figma know-how for guitar lessons.", location: "Austin, TX", joined: "2024-02-11T00:00:00Z", skillsOffered: ["UI/UX Design", "Figma Prototyping"], skillsWanted: ["Acoustic Guitar", "Spanish"] },
      { id: "usr_demo2", name: "Marcus Lee", email: "marcus@example.com", password: "Password1", bio: "Full-stack dev, weekend chef. Happy to pair-program for a home-cooked meal plan.", location: "Seattle, WA", joined: "2023-11-02T00:00:00Z", skillsOffered: ["JavaScript", "React"], skillsWanted: ["Knife Skills", "Baking"] },
      { id: "usr_demo3", name: "Priya Nair", email: "priya@example.com", password: "Password1", bio: "Classically trained pianist teaching music theory in exchange for photography tips.", location: "Chicago, IL", joined: "2024-05-19T00:00:00Z", skillsOffered: ["Piano", "Music Theory"], skillsWanted: ["Photography", "Photo Editing"] },
      { id: "usr_demo4", name: "Diego Ramirez", email: "diego@example.com", password: "Password1", bio: "Spanish tutor and home cook. Loves trading language lessons for fitness coaching.", location: "Miami, FL", joined: "2024-01-08T00:00:00Z", skillsOffered: ["Spanish", "Mexican Cooking"], skillsWanted: ["Personal Training", "Yoga"] },
      { id: "usr_demo5", name: "Hana Kobayashi", email: "hana@example.com", password: "Password1", bio: "Product photographer swapping shoots for business strategy sessions.", location: "Portland, OR", joined: "2023-09-27T00:00:00Z", skillsOffered: ["Photography", "Lightroom Editing"], skillsWanted: ["Business Planning", "SEO"] },
    ];
    write(KEYS.users, users);

    const skills = [
      { id: "skl_1", ownerId: "usr_demo1", ownerName: "Ava Torres", title: "UI/UX Design Fundamentals", category: "Design", level: "Intermediate", description: "Learn user research, wireframing and prototyping in Figma. Six sessions covering a full product design flow from brief to hi-fi mockups.", tags: ["figma", "wireframes", "ux research"], wantInReturn: "Acoustic guitar lessons or conversational Spanish", rating: 4.8, ratingCount: 12, image: "🎨" },
      { id: "skl_2", ownerId: "usr_demo2", ownerName: "Marcus Lee", title: "Modern JavaScript & React", category: "Development", level: "Advanced", description: "Hands-on React + hooks workshop: build a small app together, cover state management and clean component design.", tags: ["react", "javascript", "frontend"], wantInReturn: "Knife skills or a home baking lesson", rating: 4.9, ratingCount: 21, image: "💻" },
      { id: "skl_3", ownerId: "usr_demo3", ownerName: "Priya Nair", title: "Piano for Beginners", category: "Music", level: "Beginner", description: "Get comfortable at the keyboard: reading notation, basic chords, and your first two songs in four weeks.", tags: ["piano", "music theory"], wantInReturn: "Photography basics or Lightroom editing help", rating: 5.0, ratingCount: 8, image: "🎹" },
      { id: "skl_4", ownerId: "usr_demo4", ownerName: "Diego Ramirez", title: "Conversational Spanish", category: "Language", level: "Beginner", description: "Practical spoken Spanish for travel and everyday conversation, with real dialogue practice each session.", tags: ["spanish", "conversation"], wantInReturn: "Personal training session or yoga fundamentals", rating: 4.7, ratingCount: 15, image: "🗣️" },
      { id: "skl_5", ownerId: "usr_demo5", ownerName: "Hana Kobayashi", title: "Product Photography Basics", category: "Photography", level: "Intermediate", description: "Lighting, composition and editing for clean product shots — perfect for small shop owners and makers.", tags: ["photography", "lighting", "lightroom"], wantInReturn: "Business plan review or SEO audit", rating: 4.6, ratingCount: 9, image: "📷" },
      { id: "skl_6", ownerId: "usr_demo2", ownerName: "Marcus Lee", title: "Intro to Node.js APIs", category: "Development", level: "Intermediate", description: "Build a small REST API with Node and Express, covering routing, middleware and basic auth patterns.", tags: ["node", "api", "backend"], wantInReturn: "Cooking lesson: weeknight dinners", rating: 4.5, ratingCount: 6, image: "🖥️" },
      { id: "skl_7", ownerId: "usr_demo1", ownerName: "Ava Torres", title: "Figma Prototyping Deep Dive", category: "Design", level: "Advanced", description: "Advanced auto-layout, variants and interactive prototypes for design systems.", tags: ["figma", "design systems"], wantInReturn: "Music theory basics", rating: 4.9, ratingCount: 11, image: "🧩" },
      { id: "skl_8", ownerId: "usr_demo3", ownerName: "Priya Nair", title: "Music Theory Crash Course", category: "Music", level: "Beginner", description: "Scales, intervals and chord progressions explained simply, with keyboard exercises.", tags: ["theory", "keyboard"], wantInReturn: "Portrait photography session", rating: 4.8, ratingCount: 7, image: "🎼" },
      { id: "skl_9", ownerId: "usr_demo4", ownerName: "Diego Ramirez", title: "Home-Style Mexican Cooking", category: "Cooking", level: "Beginner", description: "Learn to make tacos al pastor, salsas from scratch, and a proper mole from a home cook's kitchen.", tags: ["cooking", "mexican food"], wantInReturn: "Strength training program", rating: 5.0, ratingCount: 14, image: "🌮" },
      { id: "skl_10", ownerId: "usr_demo5", ownerName: "Hana Kobayashi", title: "Lightroom Editing Workflow", category: "Photography", level: "Intermediate", description: "A repeatable editing workflow to get consistent, polished photos fast.", tags: ["lightroom", "editing"], wantInReturn: "Basic SEO or growth strategy", rating: 4.4, ratingCount: 5, image: "🖼️" },
      { id: "skl_11", ownerId: "usr_demo2", ownerName: "Marcus Lee", title: "Personal Fitness Coaching", category: "Fitness", level: "Beginner", description: "Wait — this one's a trade offer: Marcus wants this skill, not offering it. (Demo of a 'wanted' style listing.)", tags: ["fitness"], wantInReturn: "Trade: JavaScript mentoring", rating: 4.3, ratingCount: 3, image: "🏋️" },
      { id: "skl_12", ownerId: "usr_demo1", ownerName: "Ava Torres", title: "Brand Identity & Logo Design", category: "Design", level: "Advanced", description: "Develop a cohesive brand identity: logo, color system and typography guidelines for a small business.", tags: ["branding", "logo"], wantInReturn: "Guitar lessons", rating: 4.7, ratingCount: 10, image: "🖌️" },
    ];
    write(KEYS.skills, skills);

    const requests = [
      { id: "req_1", skillId: "skl_2", skillTitle: "Modern JavaScript & React", ownerId: "usr_demo2", ownerName: "Marcus Lee", requesterId: "usr_demo1", requesterName: "Ava Torres", message: "Would love to trade Figma sessions for a few React basics — flexible on schedule!", status: "pending", createdAt: "2025-06-01T10:00:00Z" },
      { id: "req_2", skillId: "skl_3", skillTitle: "Piano for Beginners", ownerId: "usr_demo3", ownerName: "Priya Nair", requesterId: "usr_demo5", requesterName: "Hana Kobayashi", message: "I can trade a full product photo session for piano lessons.", status: "accepted", createdAt: "2025-05-20T10:00:00Z" },
      { id: "req_3", skillId: "skl_9", skillTitle: "Home-Style Mexican Cooking", ownerId: "usr_demo4", ownerName: "Diego Ramirez", requesterId: "usr_demo2", requesterName: "Marcus Lee", message: "Big fan of home cooking — happy to build you a small API in return.", status: "completed", createdAt: "2025-04-14T10:00:00Z" },
      { id: "req_4", skillId: "skl_1", skillTitle: "UI/UX Design Fundamentals", ownerId: "usr_demo1", ownerName: "Ava Torres", requesterId: "usr_demo4", requesterName: "Diego Ramirez", message: "Could I trade Spanish conversation practice for UX lessons?", status: "declined", createdAt: "2025-05-02T10:00:00Z" },
    ];
    write(KEYS.requests, requests);

    const reviews = [
      { id: "rev_1", skillId: "skl_2", ownerId: "usr_demo2", authorName: "Ava Torres", rating: 5, comment: "Marcus is a fantastic teacher — clear explanations and real patience with my beginner questions.", createdAt: "2025-03-01T10:00:00Z" },
      { id: "rev_2", skillId: "skl_3", ownerId: "usr_demo3", authorName: "Hana Kobayashi", rating: 5, comment: "Priya made piano genuinely fun. I can play two songs already!", createdAt: "2025-03-10T10:00:00Z" },
      { id: "rev_3", skillId: "skl_1", ownerId: "usr_demo1", authorName: "Diego Ramirez", rating: 4, comment: "Really solid intro to Figma, would have liked a bit more time on prototyping.", createdAt: "2025-02-18T10:00:00Z" },
      { id: "rev_4", skillId: "skl_9", ownerId: "usr_demo4", authorName: "Marcus Lee", rating: 5, comment: "Best mole I've ever had, and Diego explained every step clearly.", createdAt: "2025-04-20T10:00:00Z" },
    ];
    write(KEYS.reviews, reviews);

    write(KEYS.seeded, true);
  }

  seed();

  return { Users, Skills, Requests, Reviews, Categories, Session, KEYS, uid, nowISO };
})();
