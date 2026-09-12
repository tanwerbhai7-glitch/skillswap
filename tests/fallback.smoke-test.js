/**
 * Smoke test: loads the REAL frontend js files (env.js, storage.js,
 * apiClient.js, dataService.js, utils.js) in a minimal shimmed
 * browser environment, then drives SSData against the live backend
 * to confirm the API-first/localStorage-fallback strategy actually
 * works end to end — not just "the code looks right".
 */
const fs = require("fs");
const path = require("path");

// ---- minimal browser shims ----
const store = new Map();
global.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
};
global.window = global;
global.window.location = { protocol: "http:", hostname: "localhost", pathname: "/index.html", search: "", href: "http://localhost/index.html" };
global.document = {
  addEventListener: () => {},
  querySelector: () => null,
  createElement: () => ({ classList: { add() {}, remove() {} }, appendChild() {}, remove() {}, setAttribute() {}, addEventListener() {} }),
  body: { appendChild() {} },
};
global.URLSearchParams = URLSearchParams;
global.fetch = fetch; // Node 18+ native fetch

function load(file, exportName) {
  const code = fs.readFileSync(path.join(__dirname, "..", "js", file), "utf8");
  const withExport = exportName ? `${code}\nglobalThis.${exportName} = ${exportName};` : code;
  // eslint-disable-next-line no-eval
  (0, eval)(withExport);
}

global.window.__SKILLSWAP_ENV__ = { API_BASE_URL: "http://localhost:5000/api", API_TIMEOUT_MS: 4000 };

load("env.js");
load("storage.js", "SkillSwapDB");
load("apiClient.js", "ApiClient");
load("dataService.js", "SSData");

async function main() {
  const results = [];
  function check(name, cond, detail) {
    results.push({ name, pass: !!cond, detail });
  }

  // 1. API is reachable (health-adjacent) but DB is down -> every data
  //    call should transparently fall back to the seeded local mock data.
  const skills = await SSData.Skills.list();
  check("Skills.list() falls back with seeded data", Array.isArray(skills) && skills.length === 12, `got ${skills.length} skills`);

  const categories = await SSData.Categories.list();
  check("Categories.list() falls back with seeded data", Array.isArray(categories) && categories.length === 8, `got ${categories.length} categories`);

  const users = await SSData.Users.list();
  check("Users.list() falls back with seeded data", Array.isArray(users) && users.length === 5, `got ${users.length} users`);

  // 2. Login against fallback (demo user seeded in localStorage mock data)
  const loggedIn = await SSData.Users.login("ava@example.com", "Password1");
  check("Users.login() works against fallback", loggedIn && loggedIn.email === "ava@example.com", JSON.stringify(loggedIn && loggedIn.email));

  // 3. Search/filter still works through the fallback path
  const filtered = await SSData.Skills.search({ category: "Design" });
  check("Skills.search() filters through fallback", filtered.every((s) => s.category === "Design") && filtered.length > 0, `got ${filtered.length} Design skills`);

  // 4. Create a skill through the fallback path and confirm it round-trips
  const created = await SSData.Skills.create({
    title: "Test Skill For Smoke Test",
    description: "A description that is definitely at least twenty characters long.",
    category: "Design",
    level: "Beginner",
    tags: ["test"],
    wantInReturn: "nothing",
    ownerId: loggedIn.id,
    ownerName: loggedIn.name,
  });
  check("Skills.create() works through fallback", created && created.title === "Test Skill For Smoke Test", JSON.stringify(created && created.id));

  const afterCreate = await SSData.Skills.list();
  check("Created skill appears in subsequent list()", afterCreate.some((s) => s.id === created.id), `total now ${afterCreate.length}`);

  // 5. Duplicate signup should be rejected even via fallback
  let duplicateRejected = false;
  try {
    await SSData.Users.signup({ name: "Ava Clone", email: "ava@example.com", password: "Password1" });
  } catch (err) {
    duplicateRejected = /already exists/i.test(err.message);
  }
  check("Users.signup() rejects duplicate email via fallback", duplicateRejected);

  // 6. apiKnownDown flag flipped after the first failed API call
  check("SSData reports API as known-down after fallback", SSData.isApiKnownDown() === true);

  console.log("\n=== SkillSwap frontend data-layer smoke test (backend up, DB down) ===\n");
  let failures = 0;
  for (const r of results) {
    console.log(`${r.pass ? "✓" : "✗"} ${r.name}${r.detail ? " — " + r.detail : ""}`);
    if (!r.pass) failures++;
  }
  console.log(`\n${results.length - failures}/${results.length} checks passed.`);
  process.exit(failures ? 1 : 0);
}

main().catch((err) => {
  console.error("Smoke test crashed:", err);
  process.exit(1);
});
