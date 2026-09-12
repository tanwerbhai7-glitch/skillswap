# SkillSwap MySQL setup

The backend uses MySQL database `skillswap`.

## `.env`

Set these values in `backend/.env`:

```env
PORT=5000
NODE_ENV=development
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=skillswap
DB_PORT=3306
```

If MySQL Workbench uses a password for the `root` account, put the same password after `DB_PASSWORD=`.

## Schema

`src/config/db.js` automatically creates the required tables on backend startup.

The schema uses normal signed `INT` IDs so it is compatible with the existing
`users.id` column in the current `skillswap` database.

The startup migration also upgrades an older `users` table that has a `password`
column to the backend's expected `password_hash` column and adds missing
`is_active` / `updated_at` columns.

## Seed demo data

After MySQL is running:

```bash
npm install
npm run seed
npm start
```

The seed command clears the SkillSwap tables and inserts demo data.
All seeded demo users use password `Password1`.


Compatibility note: startup normalizes legacy users.id/categories.id to signed INT so foreign keys match the current schema.
