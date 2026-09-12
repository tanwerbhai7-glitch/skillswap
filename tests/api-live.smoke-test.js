/**
 * Complements smoke-test.js: spins up a tiny in-process fake API
 * server that mimics the real backend's response envelope, so we can
 * verify SSData's *happy path* (API succeeds, no fallback) end to
 * end — including that it write-through-caches into localStorage.
 */
const http = require("http");
const fs = require("fs");
const path = require("path");

const store = new Map();
global.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
};
global.window = global;
global.window.location = { protocol: "http:", hostname: "localhost", pathname: "/index.html", search: "", href: "http://localhost/index.html" };
global.document = { addEventListener: () => {} };
global.URLSearchParams = URLSearchParams;
global.fetch = fetch;

function load(file, exportName) {
  const code = fs.readFileSync(path.join(__dirname, "..", "js", file), "utf8");
  const withExport = exportName ? `${code}\nglobalThis.${exportName} = ${exportName};` : code;
  (0, eval)(withExport);
}

const FAKE_CATEGORIES = [{ _id: "cat_1", name: "Design", icon: "🎨", skillCount: 2 }];
const FAKE_SKILLS = [
  { _id: "skl_100", title: "Fake API Skill", description: "x".repeat(25), category: "Design", level: "Beginner", ownerId: "usr_100", ownerName: "API User", rating: 4.5, ratingCount: 2, tags: [], createdAt: new Date().toISOString() },
];

const server = http.createServer((req, res) => {
  res.setHeader("Content-Type", "application/json");
  if (req.url.startsWith("/api/categories")) {
    res.end(JSON.stringify({ success: true, message: "ok", data: FAKE_CATEGORIES }));
  } else if (req.url.startsWith("/api/skills")) {
    res.end(JSON.stringify({ success: true, message: "ok", data: FAKE_SKILLS }));
  } else {
    res.statusCode = 404;
    res.end(JSON.stringify({ success: false, message: "not found" }));
  }
});

async function main() {
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;

  global.window.__SKILLSWAP_ENV__ = { API_BASE_URL: `http://127.0.0.1:${port}/api`, API_TIMEOUT_MS: 4000 };
  load("env.js");
  load("storage.js", "SkillSwapDB");
  load("apiClient.js", "ApiClient");
  load("dataService.js", "SSData");

  const results = [];
  function check(name, cond, detail) {
    results.push({ name, pass: !!cond, detail });
  }

  const categories = await SSData.Categories.list();
  check("Categories.list() returns live API data (not fallback)", categories.length === 1 && categories[0].name === "Design", JSON.stringify(categories));

  const skills = await SSData.Skills.list();
  check("Skills.list() returns live API data (not fallback)", skills.length === 1 && skills[0].title === "Fake API Skill", JSON.stringify(skills.map((s) => s.title)));

  check("Skill from API is normalized with .id (not just ._id)", skills[0].id === "skl_100", skills[0].id);

  const cachedLocally = SkillSwapDB.Skills.get("skl_100");
  check("API result was write-through cached into localStorage", cachedLocally && cachedLocally.title === "Fake API Skill", JSON.stringify(cachedLocally));

  check("SSData reports API as NOT known-down (happy path)", SSData.isApiKnownDown() === false);

  console.log("\n=== SkillSwap frontend data-layer smoke test (fake live API) ===\n");
  let failures = 0;
  for (const r of results) {
    console.log(`${r.pass ? "✓" : "✗"} ${r.name}${r.detail ? " — " + r.detail : ""}`);
    if (!r.pass) failures++;
  }
  console.log(`\n${results.length - failures}/${results.length} checks passed.`);
  server.close();
  process.exit(failures ? 1 : 0);
}

main().catch((err) => {
  console.error("Smoke test crashed:", err);
  server.close();
  process.exit(1);
});
