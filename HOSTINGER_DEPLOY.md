# Escloud — Hostinger deployment

This copy is provider-independent and no longer depends on the previous Chat.z/Space-Z filesystem.

## 1. Create MySQL
Create a MySQL database in Hostinger hPanel and keep the database name, username, host and password private.

## 2. Environment variable
Set `DATABASE_URL` in Hostinger to:

```text
mysql://DB_USER:DB_PASSWORD@DB_HOST:3306/DB_NAME
```

Do not commit the real password to GitHub.

## 3. Install/build
Use Node.js 22.x or newer. Hostinger should run:

```bash
npm install
npm run db:generate
npm run db:push
npm run build
npm start
```

## 4. Import the old SQLite data (optional)
The original SQLite database is preserved at `migration/legacy/custom.db`. After the MySQL schema has been created and `DATABASE_URL` points to the new database, run:

```bash
npm run db:import:sqlite
```

You can override the source file with `SQLITE_SOURCE=/path/to/custom.db`. The importer is designed for Node 22+ and the current Prisma MySQL schema.

## 5. Storage
Uploads are stored under `./storage` by default. If Hostinger gives the application a dedicated writable path, set:

```text
ESCLLOUD_STORAGE_ROOT=/home/USERNAME/domains/esclode.foodplazaa.in/storage
```

The application creates its subdirectories automatically.

## 6. Domain
Point `esclode.foodplazaa.in` to the Hostinger Node.js application. No Caddyfile or Space-Z-specific runtime scripts are required.

## 7. Important
- Do not deploy with an empty `DATABASE_URL`.
- Do not run the old `.zscripts` or Caddy configuration; they were provider-specific and have been removed.
- The legacy SQLite file is a migration backup only; the production application uses MySQL.
