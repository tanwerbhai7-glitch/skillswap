const { query } = require("../config/db");
const { normalizeRow } = require("./_helpers");
function map(r){if(!r)return null;const x=normalizeRow(r);x.skillId=x.skill_id; x.ownerId=x.owner_id; x.authorId=x.author_id; x.requestId=x.request_id; delete x.skill_id;delete x.owner_id;delete x.author_id;delete x.request_id;return x}
class Review{
 static async list({skillId,ownerId}={}){let s="SELECT * FROM reviews WHERE 1=1",p=[];if(skillId){s+=" AND skill_id=?";p.push(skillId)}if(ownerId){s+=" AND owner_id=?";p.push(ownerId)}s+=" ORDER BY created_at DESC";const[rows]=await query(s,p);return rows.map(map)}
 static async findOne(skillId,authorId){const[rows]=await query("SELECT * FROM reviews WHERE skill_id=? AND author_id=? LIMIT 1",[skillId,authorId]);return map(rows[0])}
 static async create(d){const[r]=await query(`INSERT INTO reviews(skill_id,owner_id,author_id,author_name,request_id,rating,comment) VALUES(?,?,?,?,?,?,?)`,[d.skillId,d.ownerId,d.authorId,d.authorName,d.requestId||null,d.rating,d.comment||""]);return this.findById(r.insertId)}
 static async findById(id){const[rows]=await query("SELECT * FROM reviews WHERE id=?",[id]);return map(rows[0])}
 static async delete(id){const r=await this.findById(id);if(r)await query("DELETE FROM reviews WHERE id=?",[id]);return r}
}
module.exports=Review;
