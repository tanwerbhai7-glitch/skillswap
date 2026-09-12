const { body } = require("express-validator");

const signupValidator = [
  body("name").trim().notEmpty().withMessage("Name is required").isLength({ min: 2, max: 80 }),
  body("email").trim().notEmpty().withMessage("Email is required").isEmail().withMessage("Enter a valid email address"),
  body("password")
    .notEmpty().withMessage("Password is required")
    .isLength({ min: 8 }).withMessage("Password must be at least 8 characters")
    .matches(/[A-Za-z]/).withMessage("Password must contain a letter")
    .matches(/[0-9]/).withMessage("Password must contain a number"),
];

const loginValidator = [
  body("email").trim().notEmpty().withMessage("Email is required").isEmail().withMessage("Enter a valid email address"),
  body("password").notEmpty().withMessage("Password is required"),
];

const updateUserValidator = [
  body("name").optional().trim().isLength({ min: 2, max: 80 }),
  body("email").optional().trim().isEmail().withMessage("Enter a valid email address"),
  body("isActive").optional().isBoolean(),
];

module.exports = { signupValidator, loginValidator, updateUserValidator };
