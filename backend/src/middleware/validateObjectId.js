const ApiError = require("../utils/ApiError");

function validateObjectId(paramName = "id") {
  return (req, res, next) => {
    const value = String(req.params[paramName] || "");
    if (!/^\d+$/.test(value) || Number(value) <= 0) {
      return next(ApiError.badRequest(`Invalid ${paramName}`));
    }
    next();
  };
}

module.exports = validateObjectId;
