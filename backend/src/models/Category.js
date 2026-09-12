const { query } = require("../config/db");
const { normalizeRow } = require("./_helpers");

function map(r){ return normalizeRow(r); }
class Category {
 static async list(){ const [rows]=await query("SELECT * FROM categories ORDER BY name ASC"); return rows.map(map); }
 static async findByName(name){ const [rows]=await query("SELECT * FROM categories WHERE name=? LIMIT 1",[name]); return map(rows[0]); }
 static async create({name,icon}){ const [r]=await query("INSERT INTO categories(name,icon) VALUES(?,?)",[name,icon||"🔁"]); const [rows]=await query("SELECT * FROM categories WHERE id=?",[r.insertId]); return map(rows[0]); }
 static async delete(id){ const [rows]=await query("SELECT * FROM categories WHERE id=?",[id]); if(!rows[0]) return null; await query("DELETE FROM categories WHERE id=?",[id]); return map(rows[0]); }
}
module.exports=Category;
