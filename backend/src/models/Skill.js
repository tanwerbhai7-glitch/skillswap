const { query } = require("../config/db");
const { parseJson, normalizeRow } = require("./_helpers");
function map(r){ if(!r)return null; const s=normalizeRow(r); s.tags=parseJson(s.tags,[]); s.wantInReturn=s.want_in_return; delete s.want_in_return; s.ownerId=s.owner_id; delete s.owner_id; s.ownerName=s.owner_name; delete s.owner_name; s.categoryRef=s.category_id; delete s.category_id; s.rating=Number(s.rating); s.ratingCount=Number(s.rating_count); delete s.rating_count; return s; }
class Skill {
 static async findById(id){ const [rows]=await query("SELECT * FROM skills WHERE id=? LIMIT 1",[id]); return map(rows[0]); }
 static async list({q="",category="All",level="All",ownerId,sort="newest"}={}){
  let sql="SELECT * FROM skills WHERE is_active=1", p=[];
  if(ownerId){sql+=" AND owner_id=?";p.push(ownerId)} if(category&&category!=="All"){sql+=" AND category=?";p.push(category)} if(level&&level!=="All"){sql+=" AND level=?";p.push(level)}
  if(q&&q.trim()){const n=`%${q.trim()}%`;sql+=" AND (title LIKE ? OR description LIKE ? OR owner_name LIKE ? OR CAST(tags AS CHAR) LIKE ?)";p.push(n,n,n,n)}
  const sorts={newest:"created_at DESC",oldest:"created_at ASC",rating:"rating DESC",az:"title ASC"}; sql+=` ORDER BY ${sorts[sort]||sorts.newest}`;
  const [rows]=await query(sql,p); return rows.map(map);
 }
 static async create(d){ const [r]=await query(`INSERT INTO skills(title,description,category,level,tags,want_in_return,image,owner_id,owner_name) VALUES(?,?,?,?,?,?,?,?,?)`,[d.title,d.description,d.category,d.level||"Beginner",JSON.stringify(d.tags||[]),d.wantInReturn||"",d.image||"🔁",d.ownerId,d.ownerName]); return this.findById(r.insertId); }
 static async update(id,patch){const mapCols={title:"title",description:"description",category:"category",level:"level",tags:"tags",wantInReturn:"want_in_return",image:"image",isActive:"is_active"};let f=[],p=[];for(const[k,c]of Object.entries(mapCols))if(patch[k]!==undefined){f.push(`${c}=?`);p.push(k==="tags"?JSON.stringify(patch[k]):k==="isActive"?(patch[k]?1:0):patch[k])}if(!f.length)return this.findById(id);p.push(id);await query(`UPDATE skills SET ${f.join(",")} WHERE id=?`,p);return this.findById(id)}
 static async delete(id){return this.update(id,{isActive:false})}
 static async recalculateRating(skillId){const [rows]=await query("SELECT COALESCE(AVG(rating),0) avg, COUNT(*) count FROM reviews WHERE skill_id=?",[skillId]);await query("UPDATE skills SET rating=?, rating_count=? WHERE id=?",[Number(rows[0].avg||0).toFixed(1),rows[0].count,skillId]);}
}
module.exports=Skill;
