const { validationResult } = require("express-validator");
const ApiError = require("../utils/ApiError");

/**
 * Run after an array of express-validator checks in a route definition.
 * Collects any failures into a single 400 ApiError with field details.
 */
function validateRequest(req, res, next) {
  const result = validationResult(req);
  if (!result.isEmpty()) {
    const errors = result.array().map((e) => ({ field: e.path, message: e.msg }));
    return next(ApiError.badRequest("Validation failed", errors));
  }
  next();
}

module.exports = validateRequest;
