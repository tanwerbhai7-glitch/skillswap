const mysql = require("mysql2/promise");
const config = require("./env");

const pool = mysql.createPool({
  host: config.dbHost,
  user: config.dbUser,
  password: config.dbPassword,
  database: config.dbName,
  port: config.dbPort || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  dateStrings: true,
  connectTimeout: 5000,
});

let connected = false;

async function prepareUsersTable(connection) {
  // The project may be opened on a database created by an older version
  // of SkillSwap. Normalize that table before creating dependent FKs.
  const [columns] = await connection.query("SHOW COLUMNS FROM users");
  const names = new Set(columns.map((c) => c.Field));

  if (names.has("password") && !names.has("password_hash")) {
    await connection.query(
      "ALTER TABLE users CHANGE COLUMN password password_hash VARCHAR(255) NOT NULL"
    );
  } else if (!names.has("password_hash")) {
    await connection.query(
      "ALTER TABLE users ADD COLUMN password_hash VARCHAR(255) NOT NULL DEFAULT ''"
    );
  }

  if (!names.has("is_active")) {
    await connection.query(
      "ALTER TABLE users ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1"
    );
  }

  if (!names.has("updated_at")) {
    await connection.query(
      "ALTER TABLE users ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"
    );
  }
}

async function prepareCategoriesTable(connection) {
  // Older databases may have categories.id as INT UNSIGNED/BIGINT.
  // The current schema uses signed INT so it matches skills.category_id.
  const [tables] = await connection.query("SHOW TABLES LIKE 'categories'");
  if (tables.length) {
    await connection.query("ALTER TABLE categories MODIFY COLUMN id INT NOT NULL AUTO_INCREMENT");
  }
}

async function ensureSchema(connection) {
  // users already exists in some Phase-2/early-backend databases, so
  // normalize it first. Its id is a normal signed INT in those databases.
  const [existingUsers] = await connection.query("SHOW TABLES LIKE 'users'");
  if (existingUsers.length) {
    await prepareUsersTable(connection);
  }
  await connection.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT NOT NULL AUTO_INCREMENT,
      name VARCHAR(80) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await connection.query(`
    CREATE TABLE IF NOT EXISTS profiles (
      id INT NOT NULL AUTO_INCREMENT,
      user_id INT NOT NULL UNIQUE,
      bio VARCHAR(600) NOT NULL DEFAULT '',
      location VARCHAR(120) NOT NULL DEFAULT '',
      avatar_url VARCHAR(500) NOT NULL DEFAULT '',
      skills_offered JSON NULL,
      skills_wanted JSON NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      CONSTRAINT fk_profiles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await prepareCategoriesTable(connection);

  await connection.query(`
    CREATE TABLE IF NOT EXISTS categories (
      id INT NOT NULL AUTO_INCREMENT,
      name VARCHAR(60) NOT NULL UNIQUE,
      icon VARCHAR(20) NOT NULL DEFAULT '🔁',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await connection.query(`
    CREATE TABLE IF NOT EXISTS skills (
      id INT NOT NULL AUTO_INCREMENT,
      title VARCHAR(120) NOT NULL,
      description VARCHAR(2000) NOT NULL,
      category VARCHAR(60) NOT NULL,
      category_id INT NULL,
      level ENUM('Beginner','Intermediate','Advanced') NOT NULL DEFAULT 'Beginner',
      tags JSON NULL,
      want_in_return VARCHAR(200) NOT NULL DEFAULT '',
      image VARCHAR(500) NOT NULL DEFAULT '🔁',
      owner_id INT NOT NULL,
      owner_name VARCHAR(80) NOT NULL,
      rating DECIMAL(2,1) NOT NULL DEFAULT 0,
      rating_count INT NOT NULL DEFAULT 0,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_skills_category (category),
      KEY idx_skills_owner (owner_id),
      KEY idx_skills_created (created_at),
      CONSTRAINT fk_skills_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
      CONSTRAINT fk_skills_owner FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await connection.query(`
    CREATE TABLE IF NOT EXISTS skill_requests (
      id INT NOT NULL AUTO_INCREMENT,
      skill_id INT NOT NULL,
      skill_title VARCHAR(120) NOT NULL,
      owner_id INT NOT NULL,
      owner_name VARCHAR(80) NOT NULL,
      requester_id INT NOT NULL,
      requester_name VARCHAR(80) NOT NULL,
      message VARCHAR(800) NOT NULL,
      status ENUM('pending','accepted','declined','completed') NOT NULL DEFAULT 'pending',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_requests_owner_status (owner_id,status),
      KEY idx_requests_requester_status (requester_id,status),
      KEY idx_requests_skill (skill_id),
      CONSTRAINT fk_requests_skill FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE,
      CONSTRAINT fk_requests_owner FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT fk_requests_requester FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await connection.query(`
    CREATE TABLE IF NOT EXISTS reviews (
      id INT NOT NULL AUTO_INCREMENT,
      skill_id INT NOT NULL,
      owner_id INT NOT NULL,
      author_id INT NOT NULL,
      author_name VARCHAR(80) NOT NULL,
      request_id INT NULL,
      rating TINYINT NOT NULL,
      comment VARCHAR(800) NOT NULL DEFAULT '',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_review_skill_author (skill_id,author_id),
      KEY idx_reviews_skill (skill_id),
      KEY idx_reviews_owner (owner_id),
      CONSTRAINT fk_reviews_skill FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE,
      CONSTRAINT fk_reviews_owner FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT fk_reviews_author FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT fk_reviews_request FOREIGN KEY (request_id) REFERENCES skill_requests(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
}

async function connectDB() {
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.ping();
    await ensureSchema(connection);
    connected = true;
    console.log(`[db] MySQL connected → ${config.dbName}`);
  } catch (err) {
    connected = false;
    console.error("[db] MySQL connection error:", err.message);
    if (config.isProd) process.exit(1);
    console.error("[db] Continuing in development without DB.");
  } finally {
    if (connection) connection.release();
  }
}

function isConnected() {
  return connected;
}

async function query(sql, params = []) {
  if (!connected) throw new Error("Database is not connected");
  return pool.execute(sql, params);
}

module.exports = connectDB;
module.exports.pool = pool;
module.exports.query = query;
module.exports.isConnected = isConnected;
module.exports.ensureSchema = ensureSchema;
