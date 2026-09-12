const { body } = require("express-validator");

const updateProfileValidator = [
  body("bio").optional().trim().isLength({ max: 600 }),
  body("location").optional().trim().isLength({ max: 120 }),
  body("avatarUrl").optional().trim(),
  body("skillsOffered").optional().isArray().withMessage("skillsOffered must be an array of strings"),
  body("skillsWanted").optional().isArray().withMessage("skillsWanted must be an array of strings"),
];

module.exports = { updateProfileValidator };
