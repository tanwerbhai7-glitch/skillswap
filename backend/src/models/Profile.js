const { query } = require("../config/db");
const { parseJson, normalizeRow } = require("./_helpers");

function map(row) {
  if (!row) return null;
  const p = normalizeRow(row);
  const rawUserId = p.user_id;
  p.user = rawUserId; p.userId = rawUserId; delete p.user_id;
  p.avatarUrl = p.avatar_url; delete p.avatar_url;
  p.skillsOffered = parseJson(p.skills_offered, []); delete p.skills_offered;
  p.skillsWanted = parseJson(p.skills_wanted, []); delete p.skills_wanted;
  if (p.user_name) { p.user = { id: rawUserId || p.user, name: p.user_name, email: p.user_email, createdAt: p.user_created_at }; delete p.user_name; delete p.user_email; delete p.user_created_at; }
  return p;
}

class Profile {
  static async findByUser(userId) {
    const [rows] = await query(`SELECT p.*, u.name user_name, u.email user_email, u.created_at user_created_at FROM profiles p JOIN users u ON u.id=p.user_id WHERE p.user_id=? LIMIT 1`, [userId]);
    return map(rows[0]);
  }
  static async create(data) {
    await query(`INSERT INTO profiles (user_id,bio,location,avatar_url,skills_offered,skills_wanted) VALUES (?,?,?,?,?,?)`, [data.user, data.bio || "", data.location || "", data.avatarUrl || "", JSON.stringify(data.skillsOffered || []), JSON.stringify(data.skillsWanted || [])]);
    return this.findByUser(data.user);
  }
  static async upsert(userId, patch) {
    const current = await this.findByUser(userId);
    if (!current) return this.create({ user: userId, ...patch });
    const fields=[]; const values=[]; const mapCols={bio:"bio",location:"location",avatarUrl:"avatar_url",skillsOffered:"skills_offered",skillsWanted:"skills_wanted"};
    for (const [k,c] of Object.entries(mapCols)) if (patch[k] !== undefined) { fields.push(`${c}=?`); values.push(Array.isArray(patch[k]) ? JSON.stringify(patch[k]) : patch[k]); }
    if (fields.length) { values.push(userId); await query(`UPDATE profiles SET ${fields.join(", ")} WHERE user_id=?`, values); }
    return this.findByUser(userId);
  }
  static async deleteByUser(userId) { await query("DELETE FROM profiles WHERE user_id=?", [userId]); }
}
module.exports = Profile;
