const { query } = require("../config/db");
const { normalizeRow } = require("./_helpers");
function map(r){if(!r)return null;const x=normalizeRow(r);for(const k of ["skill_id","owner_id","requester_id"]){const camel=k.replace(/_([a-z])/g,(_,c)=>c.toUpperCase());x[camel]=x[k];delete x[k]} return x}
class SkillRequest{
 static async list({userId,role="all",status}={}){let s="SELECT * FROM skill_requests WHERE 1=1",p=[];if(status){s+=" AND status=?";p.push(status)}if(userId){if(role==="owner"){s+=" AND owner_id=?";p.push(userId)}else if(role==="requester"){s+=" AND requester_id=?";p.push(userId)}else{s+=" AND (owner_id=? OR requester_id=?)";p.push(userId,userId)}}s+=" ORDER BY created_at DESC";const[rows]=await query(s,p);return rows.map(map)}
 static async findById(id){const[rows]=await query("SELECT * FROM skill_requests WHERE id=?",[id]);return map(rows[0])}
 static async findPending(skillId,requesterId){const[rows]=await query("SELECT * FROM skill_requests WHERE skill_id=? AND requester_id=? AND status='pending' LIMIT 1",[skillId,requesterId]);return map(rows[0])}
 static async create(d){const[r]=await query(`INSERT INTO skill_requests(skill_id,skill_title,owner_id,owner_name,requester_id,requester_name,message,status) VALUES(?,?,?,?,?,?,?,?)`,[d.skillId,d.skillTitle,d.ownerId,d.ownerName,d.requesterId,d.requesterName,d.message,d.status||"pending"]);return this.findById(r.insertId)}
 static async updateStatus(id,status){await query("UPDATE skill_requests SET status=? WHERE id=?",[status,id]);return this.findById(id)}
 static async delete(id){const r=await this.findById(id);if(r)await query("DELETE FROM skill_requests WHERE id=?",[id]);return r}
}
module.exports=SkillRequest;
