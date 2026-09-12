const express = require("express");
const { isConnected } = require("../config/db");
const userRoutes = require("./user.routes");
const profileRoutes = require("./profile.routes");
const skillRoutes = require("./skill.routes");
const categoryRoutes = require("./category.routes");
const skillRequestRoutes = require("./skillRequest.routes");
const reviewRoutes = require("./review.routes");
const requireDb = require("../middleware/requireDb");

const router = express.Router();

router.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "SkillSwap API is running",
    data: { time: new Date().toISOString(), dbConnected: isConnected(), database: "mysql" },
  });
});

router.get("/test-db", requireDb, async (req, res, next) => {
  try {
    const { query } = require("../config/db");
    const [rows] = await query("SELECT 1 AS ok, DATABASE() AS database_name");
    res.json({
      success: true,
      message: "Database connection is working",
      data: { ...rows[0] },
    });
  } catch (err) {
    next(err);
  }
});

router.use(requireDb);
router.use("/users", userRoutes);
router.use("/profiles", profileRoutes);
router.use("/skills", skillRoutes);
router.use("/categories", categoryRoutes);
router.use("/requests", skillRequestRoutes);
router.use("/reviews", reviewRoutes);

module.exports = router;
