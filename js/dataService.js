/* ==============================================================
   SkillSwap — Data Service (API-first, localStorage-fallback)
   ------------------------------------------------------------
   This is the ONLY module page controllers should talk to for
   data. It exposes the same resource/method shape the Phase 2
   pages already used against SkillSwapDB (Users, Skills, Requests,
   Reviews, Categories, Session) so switching the data source never
   required touching page markup or CSS — only turning each page's
   `SkillSwapDB.X(...)` into `await SSData.X(...)`.

   Strategy per call:
     1. Try the real API (js/apiClient.js).
     2. On success, mirror the result into localStorage (write-through
        cache) via SkillSwapDB's repos, so the app keeps working if
        the backend later becomes unreachable mid-session.
     3. On network/server failure, fall back to the existing
        SkillSwapDB localStorage logic and surface a one-time notice.

   Nothing here deletes or bypasses SkillSwapDB — it's Plan B, not
   replaced. window.SkillSwapDB is still fully usable directly if a
   page wants pure offline/demo behaviour (see env.js FORCE_LOCAL_ONLY).
   ============================================================== */

const SSData = (() => {
  let offlineNoticeShown = false;
  let apiKnownDown = false; // short-circuit further calls this page load once we've seen the API is unreachable

  function isForcedLocal() {
    return !!(window.SS_ENV && window.SS_ENV.FORCE_LOCAL_ONLY);
  }

  function noteOffline(err) {
    apiKnownDown = true;
    if (!offlineNoticeShown && err && err.isNetworkError) {
      offlineNoticeShown = true;
      // Non-blocking heads-up; the app keeps working on cached/local data.
      if (window.SSUtil) SSUtil.toast("Backend unreachable — using locally saved data.", "info", 4500);
      console.warn("[SSData] API unavailable, falling back to localStorage:", err.message);
    }
  }

  /** Normalizes a Mongo document ({_id, ...}) to also carry `.id`, matching the shape page code already expects. */
  function withId(doc) {
    if (!doc || typeof doc !== "object") return doc;
    if (doc._id && !doc.id) return { ...doc, id: doc._id };
    return doc;
  }
  function withIds(list) {
    return Array.isArray(list) ? list.map(withId) : list;
  }

  /** Runs an API call, falls back to a local function on any failure. Caches successful API results locally via `cache`. */
  async function tryApi(apiCall, localFallback, cache) {
    if (isForcedLocal() || apiKnownDown) return localFallback();
    try {
      const result = await apiCall();
      if (cache) cache(result);
      return result;
    } catch (err) {
      noteOffline(err);
      return localFallback();
    }
  }

  /* ================= Categories ================= */
  const Categories = {
    async list() {
      return tryApi(
        async () => withIds((await ApiClient.get("/categories")).data),
        () => SkillSwapDB.Categories.list()
      );
    },
  };

  /* ================= Users ================= */
  function cacheUser(flatUser) {
    if (flatUser && flatUser.id) SkillSwapDB.Users.upsert(flatUser.id, flatUser);
  }

  /** Merges a User doc + its Profile doc into one flat object matching the Phase 2 shape (user.bio, user.location, etc). */
  async function fetchAndMergeUser(userId) {
    const [userRes, profileRes] = await Promise.all([
      ApiClient.get(`/users/${userId}`),
      ApiClient.get(`/profiles/${userId}`).catch(() => ({ data: null })),
    ]);
    const user = withId(userRes.data);
    const profile = profileRes.data || {};
    return {
      ...user,
      bio: profile.bio || "",
      location: profile.location || "",
      avatarUrl: profile.avatarUrl || "",
      skillsOffered: profile.skillsOffered || [],
      skillsWanted: profile.skillsWanted || [],
      joined: user.createdAt,
    };
  }

  const Users = {
    async list() {
      return tryApi(
        async () => {
          const rows = withIds((await ApiClient.get("/users")).data);
          rows.forEach((u) => u.id && SkillSwapDB.Users.upsert(u.id, u));
          return rows;
        },
        () => SkillSwapDB.Users.list()
      );
    },
    async signup({ name, email, password }) {
      return tryApi(
        async () => {
          const res = await ApiClient.post("/users/signup", { name, email, password });
          const flat = { ...withId(res.data.user), ...res.data.profile, joined: res.data.user.createdAt, skillsOffered: [], skillsWanted: [] };
          cacheUser(flat);
          return flat;
        },
        () => {
          if (SkillSwapDB.Users.findByEmail(email)) {
            throw new Error("An account with that email already exists");
          }
          return SkillSwapDB.Users.create({
            name, email, password,
            bio: "", location: "", joined: SkillSwapDB.nowISO(),
            skillsOffered: [], skillsWanted: [],
          });
        }
      );
    },

    async login(email, password) {
      return tryApi(
        async () => {
          const res = await ApiClient.post("/users/login", { email, password });
          const flat = await fetchAndMergeUser(res.data.user.id || res.data.user._id);
          cacheUser(flat);
          return flat;
        },
        () => {
          const user = SkillSwapDB.Users.findByEmail(email);
          if (!user || user.password !== password) throw new Error("Incorrect email or password");
          return user;
        }
      );
    },

    async get(id) {
      return tryApi(
        async () => {
          const flat = await fetchAndMergeUser(id);
          cacheUser(flat);
          return flat;
        },
        () => SkillSwapDB.Users.get(id)
      );
    },

    /** patch may contain name/email (User) and/or bio/location/skillsOffered/skillsWanted/avatarUrl (Profile). */
    async update(id, patch) {
      return tryApi(
        async () => {
          const userPatch = {};
          const profilePatch = {};
          ["name", "email", "isActive"].forEach((k) => { if (patch[k] !== undefined) userPatch[k] = patch[k]; });
          ["bio", "location", "avatarUrl", "skillsOffered", "skillsWanted"].forEach((k) => {
            if (patch[k] !== undefined) profilePatch[k] = patch[k];
          });

          const calls = [];
          if (Object.keys(userPatch).length) calls.push(ApiClient.patch(`/users/${id}`, userPatch));
          if (Object.keys(profilePatch).length) calls.push(ApiClient.patch(`/profiles/${id}`, profilePatch));
          await Promise.all(calls);

          const flat = await fetchAndMergeUser(id);
          cacheUser(flat);
          return flat;
        },
        () => SkillSwapDB.Users.update(id, patch)
      );
    },
  };

  /* ================= Skills ================= */
  function cacheSkill(skill) {
    const s = withId(skill);
    if (s && s.id) SkillSwapDB.Skills.upsert(s.id, s);
    return s;
  }

  const Skills = {
    async list() {
      return Skills.search({});
    },
    async search(params = {}) {
      return tryApi(
        async () => {
          const qs = new URLSearchParams();
          Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== "") qs.set(k, v); });
          const res = await ApiClient.get(`/skills?${qs.toString()}`);
          const rows = withIds(res.data);
          rows.forEach(cacheSkill);
          return rows;
        },
        () => SkillSwapDB.Skills.search(params)
      );
    },

    async get(id) {
      return tryApi(
        async () => cacheSkill((await ApiClient.get(`/skills/${id}`)).data),
        () => SkillSwapDB.Skills.get(id)
      );
    },

    async byOwner(ownerId) {
      return tryApi(
        async () => {
          const rows = withIds((await ApiClient.get(`/skills?ownerId=${ownerId}`)).data);
          rows.forEach(cacheSkill);
          return rows;
        },
        () => SkillSwapDB.Skills.byOwner(ownerId)
      );
    },

    async create(data) {
      return tryApi(
        async () => cacheSkill((await ApiClient.post("/skills", data)).data),
        () => SkillSwapDB.Skills.create({ ...data, rating: 0, ratingCount: 0, image: data.image || "🔁" })
      );
    },

    async update(id, patch) {
      return tryApi(
        async () => cacheSkill((await ApiClient.patch(`/skills/${id}`, patch)).data),
        () => SkillSwapDB.Skills.update(id, patch)
      );
    },

    /** Backend soft-deletes (isActive:false); local fallback removes outright — both disappear from listings either way. */
    async remove(id) {
      return tryApi(
        async () => {
          const res = await ApiClient.delete(`/skills/${id}`);
          SkillSwapDB.Skills.remove(id);
          return res.data;
        },
        () => {
          SkillSwapDB.Skills.remove(id);
          return { id };
        }
      );
    },
  };

  /* ================= Skill Requests ================= */
  function cacheRequest(reqDoc) {
    const r = withId(reqDoc);
    if (r && r.id) SkillSwapDB.Requests.upsert(r.id, r);
    return r;
  }

  const Requests = {
    async list() {
      return tryApi(
        async () => {
          const rows = withIds((await ApiClient.get("/requests")).data);
          rows.forEach(cacheRequest);
          return rows;
        },
        () => SkillSwapDB.Requests.list()
      );
    },
    async byUser(userId) {
      return tryApi(
        async () => {
          const rows = withIds((await ApiClient.get(`/requests?userId=${userId}&role=all`)).data);
          rows.forEach(cacheRequest);
          return rows;
        },
        () => SkillSwapDB.Requests.byUser(userId)
      );
    },
    async forOwner(ownerId) {
      return tryApi(
        async () => {
          const rows = withIds((await ApiClient.get(`/requests?userId=${ownerId}&role=owner`)).data);
          rows.forEach(cacheRequest);
          return rows;
        },
        () => SkillSwapDB.Requests.forOwner(ownerId)
      );
    },
    async byRequester(requesterId) {
      return tryApi(
        async () => {
          const rows = withIds((await ApiClient.get(`/requests?userId=${requesterId}&role=requester`)).data);
          rows.forEach(cacheRequest);
          return rows;
        },
        () => SkillSwapDB.Requests.byRequester(requesterId)
      );
    },
    async create({ skillId, requesterId, requesterName, message }) {
      return tryApi(
        async () => cacheRequest((await ApiClient.post("/requests", { skillId, requesterId, requesterName, message })).data),
        () => {
          const skill = SkillSwapDB.Skills.get(skillId);
          if (!skill) throw new Error("Skill not found");
          const dup = SkillSwapDB.Requests.list().find(
            (r) => r.skillId === skillId && r.requesterId === requesterId && r.status === "pending"
          );
          if (dup) throw new Error("You already have a pending request for this skill");
          return SkillSwapDB.Requests.create({
            skillId, skillTitle: skill.title, ownerId: skill.ownerId, ownerName: skill.ownerName,
            requesterId, requesterName, message, status: "pending",
          });
        }
      );
    },
    async updateStatus(id, status) {
      return tryApi(
        async () => cacheRequest((await ApiClient.patch(`/requests/${id}/status`, { status })).data),
        () => SkillSwapDB.Requests.update(id, { status })
      );
    },
    async remove(id) {
      return tryApi(
        async () => {
          const res = await ApiClient.delete(`/requests/${id}`);
          SkillSwapDB.Requests.remove(id);
          return res.data;
        },
        () => {
          SkillSwapDB.Requests.remove(id);
          return { id };
        }
      );
    },
  };

  /* ================= Reviews ================= */
  function cacheReview(reviewDoc) {
    const r = withId(reviewDoc);
    if (r && r.id) SkillSwapDB.Reviews.upsert(r.id, r);
    return r;
  }

  const Reviews = {
    async list() {
      return tryApi(
        async () => {
          const rows = withIds((await ApiClient.get("/reviews")).data);
          rows.forEach(cacheReview);
          return rows;
        },
        () => SkillSwapDB.Reviews.list()
      );
    },
    async forSkill(skillId) {
      return tryApi(
        async () => {
          const rows = withIds((await ApiClient.get(`/reviews?skillId=${skillId}`)).data);
          rows.forEach(cacheReview);
          return rows;
        },
        () => SkillSwapDB.Reviews.forSkill(skillId)
      );
    },
    async forOwner(ownerId) {
      return tryApi(
        async () => {
          const rows = withIds((await ApiClient.get(`/reviews?ownerId=${ownerId}`)).data);
          rows.forEach(cacheReview);
          return rows;
        },
        () => SkillSwapDB.Reviews.forOwner(ownerId)
      );
    },
    async create({ skillId, authorId, authorName, rating, comment, requestId }) {
      return tryApi(
        async () => cacheReview((await ApiClient.post("/reviews", { skillId, authorId, authorName, rating, comment, requestId })).data),
        () => {
          const skill = SkillSwapDB.Skills.get(skillId);
          if (!skill) throw new Error("Skill not found");
          return SkillSwapDB.Reviews.create({ skillId, ownerId: skill.ownerId, authorId, authorName, rating, comment });
        }
      );
    },
  };

  /* ================= Session =================
     No JWT yet (Phase 5) — "who's logged in" is still just a userId
     pointer in localStorage, same as Phase 2. What changed is that
     currentUser() now resolves that id through the API (with the
     merged User+Profile shape) instead of a plain local array. */
  const Session = {
    get: () => SkillSwapDB.Session.get(),
    set: (userId) => SkillSwapDB.Session.set(userId),
    clear: () => SkillSwapDB.Session.clear(),
    async currentUser() {
      const s = SkillSwapDB.Session.get();
      if (!s) return null;
      return Users.get(s.userId);
    },
  };

  return { Categories, Users, Skills, Requests, Reviews, Session, isApiForced: isForcedLocal, isApiKnownDown: () => apiKnownDown };
})();
