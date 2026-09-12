/**
 * Wraps every successful response in a consistent envelope:
 *   { success: true, message, data, meta }
 * so the frontend can rely on one shape regardless of endpoint.
 */
function sendSuccess(res, { statusCode = 200, message = "OK", data = null, meta = null }) {
  const body = { success: true, message, data };
  if (meta) body.meta = meta;
  return res.status(statusCode).json(body);
}

module.exports = { sendSuccess };
