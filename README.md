# SkillSwap

A skill-exchange marketplace. Phase 1–2 shipped a fully working frontend
(HTML/CSS/vanilla JS) backed by `localStorage`. Phase 3–4 add a real
Node.js/Express/MySQL backend behind that same frontend, **without**
redesigning any UI or deleting the localStorage logic.

## Project layout

```
skillswap/
├── *.html                 Pages (unchanged from Phase 1–2)
├── css/style.css           Design system (unchanged)
├── js/
│   ├── env.js               ← NEW  environment/API config
│   ├── apiClient.js         ← NEW  thin fetch() wrapper
│   ├── dataService.js       ← NEW  SSData: API-first, localStorage-fallback facade
│   ├── storage.js           Phase 2 localStorage layer — still fully intact, now doubles as an offline cache
│   ├── layout.js, *.js      Page controllers — now call `SSData.*` (async) instead of `SkillSwapDB.*` (sync)
│   └── cards.js, utils.js   Unchanged
├── backend/                ← NEW  Node.js/Express/MySQL API
│   ├── server.js, app.js
│   └── src/{config,routes,controllers,models,middleware,validators,utils}
└── tests/                  ← NEW  Node-based smoke tests for the data layer
```

## Running it

### 1. Backend

```bash
cd backend
npm install
copy .env.example .env    # Windows PowerShell: Copy-Item .env.example .env
# Put your MySQL password in DB_PASSWORD if your root account has one.
npm run seed                # populates MySQL with demo data (same as the old mock data)
npm start                   # or `npm run dev` for auto-restart
```

The API listens on `http://localhost:5000` by default (`GET /api/health` to check).

### 2. Frontend

Serve the project root with any static file server, e.g.:

```bash
npx http-server . -p 8080
```

Open `http://localhost:8080/index.html`. `js/env.js` auto-detects the backend
at `http://<same-host>:5000/api` — no configuration needed for local dev.
To point at a different backend (staging/prod), set it before `env.js` loads:

```html
<script>window.__SKILLSWAP_ENV__ = { API_BASE_URL: "https://api.example.com/api" };</script>
<script src="js/env.js"></script>
```

### 3. Demo login

Every seeded user shares the password `Password1` (e.g. `ava@example.com`).

## How the data layer switches sources

`js/dataService.js` (`SSData`) is the **only** thing page controllers talk to.
For every call it:

1. Tries the real API via `js/apiClient.js`.
2. On success, mirrors the result into `localStorage` (write-through cache).
3. On any network/server failure, transparently falls back to the original
   `SkillSwapDB` localStorage logic and shows a one-time "backend unreachable"
   toast — the app keeps working either way.

This means the UI never has to know or care whether data came from MySQL
or `localStorage`. Set `window.__SKILLSWAP_ENV__ = { FORCE_LOCAL_ONLY: true }`
before `env.js` loads to run the pure Phase 2 experience on demand.

## Verifying it works

```bash
# with the backend NOT fully reachable (or DB down) — exercises the fallback path
node tests/fallback.smoke-test.js

# spins up a fake in-process API to exercise the happy path
node tests/api-live.smoke-test.js
```

Both are plain Node scripts (no browser needed) that load the actual
frontend JS files and drive `SSData` directly.

## What Phase 5+ will change (by design, not by rewrite)

- `backend/src/middleware/auth.js` already exists as a no-op
  (`attachUserIfPresent`/`requireAuth`) so JWT can be wired in without
  touching route files.
- `backend/src/config/env.js` already reads `JWT_SECRET`/`JWT_EXPIRES_IN`.
- Passwords are already hashed with bcrypt and never returned from the API.
- `SSData.Session` already isolates "who's logged in" from the rest of the
  data layer, so swapping a local userId pointer for a real token is a
  contained change.
