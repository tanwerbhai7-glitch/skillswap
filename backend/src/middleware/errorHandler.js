const ApiError = require("../utils/ApiError");
const config = require("../config/env");

/**
 * Normalizes any thrown error (ApiError, Mongoose validation error,
 * duplicate-key error, cast error, or an unexpected bug) into the
 * same JSON envelope: { success: false, message, errors }.
 * Mount this LAST, after all routes.
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal server error";
  let errors = err.details || null;

  // Mongoose validation errors → 400 with field-level messages
  if (err.name === "ValidationError") {
    statusCode = 400;
    message = "Validation failed";
    errors = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
  }

  // Mongoose bad ObjectId → 400
  if (err.name === "CastError") {
    statusCode = 400;
    message = `Invalid value for "${err.path}"`;
  }

  // Mongo duplicate key → 409
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || {})[0] || "field";
    message = `A record with that ${field} already exists`;
  }

  if (!err.isOperational && statusCode === 500) {
    console.error("[error]", err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    errors,
    ...(config.env === "development" && statusCode === 500 ? { stack: err.stack } : {}),
  });
}

module.exports = errorHandler;
module.exports.ApiError = ApiError;
