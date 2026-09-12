const express = require("express");
const cors = require("cors");
const morgan = require("morgan");

const config = require("./src/config/env");
const apiRoutes = require("./src/routes");
const notFound = require("./src/middleware/notFound");
const errorHandler = require("./src/middleware/errorHandler");
const { attachUserIfPresent } = require("./src/middleware/auth");

const app = express();

/* ---------- core middleware ---------- */
app.use(
  cors({
    origin(origin, callback) {
      // Allow tools like curl/Postman (no origin header) and any
      // explicitly whitelisted frontend origin from CLIENT_ORIGINS.
      if (!origin || config.clientOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`CORS: origin ${origin} is not allowed`));
    },
    credentials: true,
  })
);
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
if (!config.isProd) app.use(morgan("dev"));

// No-op today; wires cleanly into Phase 5 JWT auth without route changes.
app.use(attachUserIfPresent);

/* ---------- routes ---------- */
app.get("/", (req, res) => {
  res.json({ success: true, message: "SkillSwap API — see /api/health", data: null });
});
app.use("/api", apiRoutes);

/* ---------- error handling (must be last) ---------- */
app.use(notFound);
app.use(errorHandler);

module.exports = app;
