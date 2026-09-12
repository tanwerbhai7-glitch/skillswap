const { pool } = require("../config/db");
const connectDB = require("../config/db");
const bcrypt = require("bcryptjs");

async function seed() {
  await connectDB();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query("SET FOREIGN_KEY_CHECKS = 0");
    for (const table of ["reviews","skill_requests","skills","profiles","categories","users"]) await conn.query(`TRUNCATE TABLE ${table}`);
    await conn.query("SET FOREIGN_KEY_CHECKS = 1");

    const categories=[
      ["Design","🎨"],["Development","💻"],["Music","🎸"],["Language","🗣️"],["Cooking","🍳"],["Fitness","🏋️"],["Photography","📷"],["Business","📈"]
    ];
    for(const [name,icon] of categories) await conn.query("INSERT INTO categories(name,icon) VALUES(?,?)",[name,icon]);

    const userSeeds=[
      ["Ava Torres","ava@example.com","UX designer who trades Figma know-how for guitar lessons.","Austin, TX",["UI/UX Design","Figma Prototyping"],["Acoustic Guitar","Spanish"]],
      ["Marcus Lee","marcus@example.com","Full-stack dev, weekend chef. Happy to pair-program for a home-cooked meal plan.","Seattle, WA",["JavaScript","React"],["Knife Skills","Baking"]],
      ["Priya Nair","priya@example.com","Classically trained pianist teaching music theory in exchange for photography tips.","Chicago, IL",["Piano","Music Theory"],["Photography","Photo Editing"]],
      ["Diego Ramirez","diego@example.com","Spanish tutor and home cook. Loves trading language lessons for fitness coaching.","Miami, FL",["Spanish","Mexican Cooking"],["Personal Training","Yoga"]],
      ["Hana Kobayashi","hana@example.com","Product photographer swapping shoots for business strategy sessions.","Portland, OR",["Photography","Lightroom Editing"],["Business Planning","SEO"]]
    ];
    const hash=await bcrypt.hash("Password1",10), users={};
    for(const u of userSeeds){const[r]=await conn.query("INSERT INTO users(name,email,password_hash) VALUES(?,?,?)",[u[0],u[1],hash]);users[u[1]]={id:r.insertId,name:u[0]};await conn.query("INSERT INTO profiles(user_id,bio,location,skills_offered,skills_wanted) VALUES(?,?,?,?,?)",[r.insertId,u[2],u[3],JSON.stringify(u[4]),JSON.stringify(u[5])]);}

    const skillSeeds=[
      ["UI/UX Design Fundamentals","Learn user research, wireframing and prototyping in Figma. Six sessions covering a full product design flow from brief to hi-fi mockups.","Design","Intermediate",["figma","wireframes","ux research"],"Acoustic guitar lessons or conversational Spanish","🎨","ava@example.com"],
      ["Modern JavaScript & React","Hands-on React + hooks workshop: build a small app together, cover state management and clean component design.","Development","Advanced",["react","javascript","frontend"],"Knife skills or a home baking lesson","💻","marcus@example.com"],
      ["Piano for Beginners","Get comfortable at the keyboard: reading notation, basic chords, and your first two songs in four weeks.","Music","Beginner",["piano","music theory"],"Photography basics or Lightroom editing help","🎹","priya@example.com"],
      ["Conversational Spanish","Practical spoken Spanish for travel and everyday conversation, with real dialogue practice each session.","Language","Beginner",["spanish","conversation"],"Personal training session or yoga fundamentals","🗣️","diego@example.com"],
      ["Product Photography Basics","Lighting, composition and editing for clean product shots — perfect for small shop owners and makers.","Photography","Intermediate",["photography","lighting","lightroom"],"Business plan review or SEO audit","📷","hana@example.com"],
      ["Intro to Node.js APIs","Build a small REST API with Node and Express, covering routing, middleware and basic auth patterns.","Development","Intermediate",["node","api","backend"],"Cooking lesson: weeknight dinners","🖥️","marcus@example.com"],
      ["Figma Prototyping Deep Dive","Advanced auto-layout, variants and interactive prototypes for design systems.","Design","Advanced",["figma","design systems"],"Music theory basics","🧩","ava@example.com"],
      ["Music Theory Crash Course","Scales, intervals and chord progressions explained simply, with keyboard exercises.","Music","Beginner",["theory","keyboard"],"Portrait photography session","🎼","priya@example.com"],
      ["Home-Style Mexican Cooking","Learn to make tacos al pastor, salsas from scratch, and a proper mole from a home cook's kitchen.","Cooking","Beginner",["cooking","mexican food"],"Strength training program","🌮","diego@example.com"],
      ["Lightroom Editing Workflow","A repeatable editing workflow to get consistent, polished photos fast.","Photography","Intermediate",["lightroom","editing"],"Basic SEO or growth strategy","🖼️","hana@example.com"],
      ["Brand Identity & Logo Design","Develop a cohesive brand identity: logo, color system and typography guidelines for a small business.","Design","Advanced",["branding","logo"],"Guitar lessons","🖌️","ava@example.com"]
    ];
    const skills={};
    for(const s of skillSeeds){const o=users[s[7]];const[r]=await conn.query("INSERT INTO skills(title,description,category,level,tags,want_in_return,image,owner_id,owner_name) VALUES(?,?,?,?,?,?,?,?,?)",[s[0],s[1],s[2],s[3],JSON.stringify(s[4]),s[5],s[6],o.id,o.name]);skills[s[0]]={id:r.insertId,title:s[0],ownerId:o.id,ownerName:o.name};}

    const requests=[
      ["Modern JavaScript & React","ava@example.com","Would love to trade Figma sessions for a few React basics — flexible on schedule!","pending"],
      ["Piano for Beginners","hana@example.com","I can trade a full product photo session for piano lessons.","accepted"],
      ["Home-Style Mexican Cooking","marcus@example.com","Big fan of home cooking — happy to build you a small API in return.","completed"],
      ["UI/UX Design Fundamentals","diego@example.com","Could I trade Spanish conversation practice for UX lessons?","declined"]
    ];
    for(const r of requests){const s=skills[r[0]], req=users[r[1]];await conn.query("INSERT INTO skill_requests(skill_id,skill_title,owner_id,owner_name,requester_id,requester_name,message,status) VALUES(?,?,?,?,?,?,?,?)",[s.id,s.title,s.ownerId,s.ownerName,req.id,req.name,r[2],r[3]]);}

    const reviews=[
      ["Modern JavaScript & React","ava@example.com",5,"Marcus is a fantastic teacher — clear explanations and real patience with my beginner questions."],
      ["Piano for Beginners","hana@example.com",5,"Priya made piano genuinely fun. I can play two songs already!"],
      ["UI/UX Design Fundamentals","diego@example.com",4,"Really solid intro to Figma, would have liked a bit more time on prototyping."],
      ["Home-Style Mexican Cooking","marcus@example.com",5,"Best mole I've ever had, and Diego explained every step clearly."]
    ];
    for(const r of reviews){const s=skills[r[0]],a=users[r[1]];await conn.query("INSERT INTO reviews(skill_id,owner_id,author_id,author_name,rating,comment) VALUES(?,?,?,?,?,?)",[s.id,s.ownerId,a.id,a.name,r[2],r[3]]);}
    await conn.query("UPDATE skills s SET rating=(SELECT ROUND(COALESCE(AVG(r.rating),0),1) FROM reviews r WHERE r.skill_id=s.id), rating_count=(SELECT COUNT(*) FROM reviews r WHERE r.skill_id=s.id)");
    await conn.commit();
    console.log("[seed] Done. Demo password for all users: Password1");
  } catch(e){await conn.rollback();throw e} finally{conn.release();await pool.end()}
}
seed().catch(e=>{console.error("[seed] Failed:",e);process.exit(1)});
