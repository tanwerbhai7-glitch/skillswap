/**
 * Wraps an async route handler so rejected promises are forwarded to
 * next(err) automatically, instead of every controller needing its
 * own try/catch block.
 */
function asyncHandler(fn) {
  return function wrapped(req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = asyncHandler;
