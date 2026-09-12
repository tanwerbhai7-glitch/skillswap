/** Catches any request that didn't match a route and forwards a 404. */
function notFound(req, res, next) {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
    errors: null,
  });
}

module.exports = notFound;
