const ApiError = require("../utils/ApiError");
const { isConnected } = require("../config/db");

function requireDb(req, res, next) {
  if (!isConnected()) {
    return next(ApiError.serviceUnavailable("Database is not connected. Try again shortly."));
  }
  next();
}

module.exports = requireDb;
