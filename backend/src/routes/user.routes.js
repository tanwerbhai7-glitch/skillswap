const express = require("express");
const userController = require("../controllers/user.controller");
const validateRequest = require("../middleware/validateRequest");
const validateObjectId = require("../middleware/validateObjectId");
const { signupValidator, loginValidator, updateUserValidator } = require("../validators/user.validator");

const router = express.Router();

// Auth-flavored endpoints (no JWT/session issuance yet — that's Phase 5)
router.post("/signup", signupValidator, validateRequest, userController.signup);
router.post("/login", loginValidator, validateRequest, userController.login);

router.get("/", userController.listUsers);
router.get("/:id", validateObjectId("id"), userController.getUser);
router.patch("/:id", validateObjectId("id"), updateUserValidator, validateRequest, userController.updateUser);
router.delete("/:id", validateObjectId("id"), userController.deleteUser);

module.exports = router;
