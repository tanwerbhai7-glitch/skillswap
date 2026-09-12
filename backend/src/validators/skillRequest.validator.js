const { body } = require("express-validator");

const createRequestValidator = [
  body("skillId").notEmpty().withMessage("skillId is required").isInt({ min: 1 }).withMessage("skillId must be a valid id"),
  body("requesterId").notEmpty().withMessage("requesterId is required").isInt({ min: 1 }).withMessage("requesterId must be a valid id"),
  body("requesterName").trim().notEmpty().withMessage("requesterName is required"),
  body("message")
    .trim()
    .notEmpty().withMessage("A message is required")
    .isLength({ min: 10, max: 800 }).withMessage("Message should be at least 10 characters"),
];

const updateStatusValidator = [
  body("status").isIn(["pending", "accepted", "declined", "completed"]).withMessage("Invalid status value"),
];

module.exports = { createRequestValidator, updateStatusValidator };
