const { body } = require("express-validator");

const createSkillValidator = [
  body("title").trim().notEmpty().withMessage("Title is required").isLength({ min: 3, max: 120 }),
  body("description")
    .trim()
    .notEmpty().withMessage("Description is required")
    .isLength({ min: 20, max: 2000 }).withMessage("Description should be at least 20 characters"),
  body("category").trim().notEmpty().withMessage("Category is required"),
  body("level").optional().isIn(["Beginner", "Intermediate", "Advanced"]),
  body("tags").optional().isArray(),
  body("wantInReturn").optional().trim().isLength({ max: 200 }),
  body("ownerId").notEmpty().withMessage("ownerId is required").isInt({ min: 1 }).withMessage("ownerId must be a valid id"),
  body("ownerName").trim().notEmpty().withMessage("ownerName is required"),
];

const updateSkillValidator = [
  body("title").optional().trim().isLength({ min: 3, max: 120 }),
  body("description").optional().trim().isLength({ min: 20, max: 2000 }),
  body("category").optional().trim().notEmpty(),
  body("level").optional().isIn(["Beginner", "Intermediate", "Advanced"]),
  body("tags").optional().isArray(),
  body("wantInReturn").optional().trim().isLength({ max: 200 }),
  body("isActive").optional().isBoolean(),
];

module.exports = { createSkillValidator, updateSkillValidator };
