/**
 * Placeholder for Phase 5. Intentionally NOT wired into any route yet —
 * Phase 4 has no JWT auth. This stub exists so route files can already
 * import `attachUserIfPresent` / `requireAuth` without a rewrite later;
 * both are currently no-ops that just call next().
 */
function attachUserIfPresent(req, res, next) {
  // Phase 5: decode a bearer token here and set req.user if valid.
  next();
}

function requireAuth(req, res, next) {
  // Phase 5: reject with 401 if req.user isn't set by attachUserIfPresent.
  next();
}

module.exports = { attachUserIfPresent, requireAuth };
