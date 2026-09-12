/**
 * SkillSwap — Centralized environment configuration
 */

require("dotenv").config();

const config = {
    env: process.env.NODE_ENV || "development",

    port: Number(process.env.PORT) || 5000,

    // ================================
    // MySQL Configuration
    // ================================

    dbHost: process.env.DB_HOST || "localhost",

    dbUser: process.env.DB_USER || "root",

    dbPassword: process.env.DB_PASSWORD || "",

    dbName: process.env.DB_NAME || "skillswap",

    dbPort: Number(process.env.DB_PORT) || 3306,

    // ================================
    // Frontend CORS
    // ================================

   clientOrigins: (
    process.env.CLIENT_ORIGINS ||
    "http://localhost:5500,http://127.0.0.1:5500,http://localhost:5501,http://127.0.0.1:5501"
)
        .split(",")
        .map((o) => o.trim())
        .filter(Boolean),

    // ================================
    // JWT — future use
    // ================================

    jwtSecret: process.env.JWT_SECRET || "",

    jwtExpiresIn:
        process.env.JWT_EXPIRES_IN || "7d",

    isProd:
        (process.env.NODE_ENV || "development") ===
        "production",
};

module.exports = config;