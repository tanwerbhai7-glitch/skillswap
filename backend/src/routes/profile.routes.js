const express = require("express");
const profileController = require("../controllers/profile.controller");
const validateRequest = require("../middleware/validateRequest");
const validateObjectId = require("../middleware/validateObjectId");
const { updateProfileValidator } = require("../validators/profile.validator");

const router = express.Router();

router.get("/:userId", validateObjectId("userId"), profileController.getProfileByUser);
router.patch(
  "/:userId",
  validateObjectId("userId"),
  updateProfileValidator,
  validateRequest,
  profileController.updateProfile
);

module.exports = router;
