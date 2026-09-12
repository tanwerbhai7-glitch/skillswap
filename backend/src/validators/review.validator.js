const { body } = require("express-validator");

const createReviewValidator = [
  body("skillId").notEmpty().withMessage("skillId is required").isInt({ min: 1 }).withMessage("skillId must be a valid id"),
  body("authorId").notEmpty().withMessage("authorId is required").isInt({ min: 1 }).withMessage("authorId must be a valid id"),
  body("authorName").trim().notEmpty().withMessage("authorName is required"),
  body("rating").notEmpty().withMessage("rating is required").isInt({ min: 1, max: 5 }).withMessage("rating must be 1-5"),
  body("comment").optional().trim().isLength({ max: 800 }),
];

module.exports = { createReviewValidator };
