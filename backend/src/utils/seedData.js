const { pool } = require("../config/db");
const connectDB = require("../config/db");

async function seed() {
  await connectDB();
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    // This command initializes only public categories.
    // It deliberately does not create fake users, skills, requests or reviews.
    const categories = [
      ["Design", "🎨"],
      ["Development", "💻"],
      ["Music", "🎸"],
      ["Language", "🗣️"],
      ["Cooking", "🍳"],
      ["Fitness", "🏋️"],
      ["Photography", "📷"],
      ["Business", "📈"],
    ];

    for (const [name, icon] of categories) {
      await conn.query(
        "INSERT INTO categories(name, icon) VALUES(?, ?) ON DUPLICATE KEY UPDATE icon = VALUES(icon)",
        [name, icon]
      );
    }

    await conn.commit();
    console.log("[seed] Public categories initialized. No sample accounts or listings were created.");
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
    await pool.end();
  }
}

seed().catch((e) => {
  console.error("[seed] Failed:", e);
  process.exit(1);
});
