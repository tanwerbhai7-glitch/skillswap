/* ==============================================================
   SkillSwap — Environment configuration
   ============================================================== */

(function () {
    const overrides = window.__SKILLSWAP_ENV__ || {};

    // Backend API
    const defaultApiBase =
        `${window.location.protocol}//${window.location.hostname}:5000/api`;

    window.SS_ENV = {
        API_BASE_URL:
            overrides.API_BASE_URL || defaultApiBase,

        API_TIMEOUT_MS:
            overrides.API_TIMEOUT_MS || 8000,

        // false = use real backend
        // true  = use localStorage only
        FORCE_LOCAL_ONLY:
            overrides.FORCE_LOCAL_ONLY ?? false
    };

    console.log(
        "[SkillSwap] API:",
        window.SS_ENV.API_BASE_URL
    );

    console.log(
        "[SkillSwap] Local-only mode:",
        window.SS_ENV.FORCE_LOCAL_ONLY
    );
})();