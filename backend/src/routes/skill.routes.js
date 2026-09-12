const express = require("express");
const skillController = require("../controllers/skill.controller");
const validateRequest = require("../middleware/validateRequest");
const validateObjectId = require("../middleware/validateObjectId");
const { createSkillValidator, updateSkillValidator } = require("../validators/skill.validator");

const router = express.Router();

router.get("/", skillController.listSkills);
router.get("/:id", validateObjectId("id"), skillController.getSkill);
router.post("/", createSkillValidator, validateRequest, skillController.createSkill);
router.patch("/:id", validateObjectId("id"), updateSkillValidator, validateRequest, skillController.updateSkill);
router.delete("/:id", validateObjectId("id"), skillController.deleteSkill);

module.exports = router;
