const { body } = require("express-validator");

const createCategoryValidator = [
  body("name").trim().notEmpty().withMessage("Category name is required").isLength({ max: 60 }),
  body("icon").optional().trim(),
];

module.exports = { createCategoryValidator };
