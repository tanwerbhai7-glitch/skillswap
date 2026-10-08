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

## Initialize categories

Use `npm run seed` to initialize the public skill categories. The command does not create sample users, listings, requests, reviews, or passwords.

