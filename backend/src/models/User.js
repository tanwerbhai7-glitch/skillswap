const bcrypt = require("bcryptjs");
const { query } = require("../config/db");
const { normalizeRow } = require("./_helpers");

function safe(row) {
  if (!row) return null;
  const u = normalizeRow(row);
  return { id: u.id, _id: u._id, name: u.name, email: u.email, isActive: u.isActive, createdAt: u.createdAt, updatedAt: u.updatedAt };
}

class User {
  static async findById(id, includePassword = false) {
    const [rows] = await query("SELECT * FROM users WHERE id = ? LIMIT 1", [id]);
    if (!rows[0]) return null;
    const u = normalizeRow(rows[0]);
    u.passwordHash = u.password_hash;
    delete u.password_hash;
    if (!includePassword) delete u.passwordHash;
    u.toSafeObject = () => safe(u);
    u.comparePassword = (password) => bcrypt.compare(password, u.passwordHash);
    return u;
  }

  static async findOneByEmail(email, includePassword = false) {
    const [rows] = await query("SELECT * FROM users WHERE email = ? LIMIT 1", [email]);
    if (!rows[0]) return null;
    const u = normalizeRow(rows[0]);
    u.passwordHash = u.password_hash; delete u.password_hash;
    if (!includePassword) delete u.passwordHash;
    u.toSafeObject = () => safe(u);
    u.comparePassword = (password) => bcrypt.compare(password, u.passwordHash);
    return u;
  }

  static async list() {
    const [rows] = await query("SELECT * FROM users ORDER BY created_at DESC");
    return rows.map(safe);
  }

  static async create({ name, email, passwordHash }) {
    const [result] = await query("INSERT INTO users (name,email,password_hash) VALUES (?,?,?)", [name, email, passwordHash]);
    return this.findById(result.insertId);
  }

  static async update(id, patch) {
    const fields = []; const values = [];
    const map = { name: "name", email: "email", isActive: "is_active" };
    for (const [key, col] of Object.entries(map)) if (patch[key] !== undefined) { fields.push(`${col} = ?`); values.push(key === "isActive" ? (patch[key] ? 1 : 0) : patch[key]); }
    if (!fields.length) return this.findById(id);
    values.push(id); await query(`UPDATE users SET ${fields.join(", ")} WHERE id = ?`, values);
    return this.findById(id);
  }

  static async delete(id) {
    const user = await this.findById(id);
    if (!user) return null;
    await query("DELETE FROM users WHERE id = ?", [id]);
    return user;
  }

  static hashPassword(password) { return bcrypt.hash(password, 10); }
}

module.exports = User;
