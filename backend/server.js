const app = require("./app");
const config = require("./src/config/env");
const connectDB = require("./src/config/db");

async function start() {
  await connectDB();

  const server = app.listen(config.port, () => {
    console.log(`[server] SkillSwap API listening on port ${config.port} (${config.env})`);
  });

  process.on("unhandledRejection", (err) => {
    console.error("[server] Unhandled rejection:", err);
    server.close(() => process.exit(1));
  });
}

start();
