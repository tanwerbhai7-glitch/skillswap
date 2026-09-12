/* ==============================================================
   SkillSwap — API client
   ------------------------------------------------------------
   A thin fetch() wrapper. Nothing in here knows about skills or
   users — it just talks to SS_ENV.API_BASE_URL and returns parsed
   JSON or throws a normalized ApiClientError. dataService.js is
   the layer that knows what a "skill" is.
   ============================================================== */

class ApiClientError extends Error {
  constructor(message, { status = 0, errors = null, isNetworkError = false } = {}) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.errors = errors;
    this.isNetworkError = isNetworkError; // true = couldn't reach the server at all
  }
}

const ApiClient = (() => {
  function withTimeout(promise, ms) {
    let timeoutId;
    const timeout = new Promise((_, reject) => {
      timeoutId = setTimeout(() => reject(new ApiClientError("Request timed out", { isNetworkError: true })), ms);
    });
    return Promise.race([promise, timeout]).finally(() => clearTimeout(timeoutId));
  }

  async function request(path, { method = "GET", body, headers = {} } = {}) {
    const base = (window.SS_ENV && window.SS_ENV.API_BASE_URL) || "";
    const url = `${base}${path}`;
    const timeoutMs = (window.SS_ENV && window.SS_ENV.API_TIMEOUT_MS) || 8000;

    let response;
    try {
      response = await withTimeout(
        fetch(url, {
          method,
          headers: { "Content-Type": "application/json", ...headers },
          body: body !== undefined ? JSON.stringify(body) : undefined,
        }),
        timeoutMs
      );
    } catch (err) {
      // Network failure, CORS rejection, DNS error, timeout, server not running…
      throw new ApiClientError(err.message || "Network error — could not reach the server", {
        isNetworkError: true,
      });
    }

    let payload = null;
    try {
      payload = await response.json();
    } catch (_) {
      // Non-JSON response body; fall through with payload = null
    }

    if (!response.ok) {
      const message = (payload && payload.message) || `Request failed with status ${response.status}`;
      throw new ApiClientError(message, {
        status: response.status,
        errors: payload && payload.errors,
        isNetworkError: false,
      });
    }

    return payload; // { success, message, data, meta }
  }

  return {
    get: (path) => request(path, { method: "GET" }),
    post: (path, body) => request(path, { method: "POST", body }),
    patch: (path, body) => request(path, { method: "PATCH", body }),
    delete: (path) => request(path, { method: "DELETE" }),
  };
})();
