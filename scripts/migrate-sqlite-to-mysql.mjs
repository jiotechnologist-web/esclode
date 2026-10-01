import { DatabaseSync } from "node:sqlite";
import { PrismaClient } from "@prisma/client";
import path from "node:path";
import process from "node:process";

const source = path.resolve(process.env.SQLITE_SOURCE || "migration/legacy/custom.db");
const sqlite = new DatabaseSync(source, { readOnly: true });
const prisma = new PrismaClient();

const dateColumns = new Set([
  "expiresAt", "createdAt", "updatedAt", "lastActive", "startedAt", "endedAt",
  "authorizedAt", "usedAt", "watchedAt", "grantedAt", "completedAt", "receivedAt",
]);

function convertValue(column, value) {
  if (value === null || value === undefined) return null;
  if (dateColumns.has(column)) {
    if (typeof value === "number" || typeof value === "bigint") return new Date(Number(value));
    if (value instanceof Date) return value;
    const n = Number(value);
    if (Number.isFinite(n)) return new Date(n);
    return new Date(String(value));
  }
  return value;
}

const tables = sqlite.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name`).all().map((r) => r.name);

function quoteIdent(value) { return `\`${String(value).replaceAll("`", "``")}\``; }

let total = 0;
try {
  await prisma.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 0");
  for (const table of tables) {
    const rows = sqlite.prepare(`SELECT * FROM ${quoteIdent(table)}`).all();
    if (!rows.length) continue;
    const columns = Object.keys(rows[0]);
    const colSql = columns.map(quoteIdent).join(", ");
    let copied = 0;
    for (const row of rows) {
      const values = columns.map((c) => convertValue(c, row[c]));
      const placeholders = values.map(() => "?").join(", ");
      const sql = `INSERT IGNORE INTO ${quoteIdent(table)} (${colSql}) VALUES (${placeholders})`;
      await prisma.$executeRawUnsafe(sql, ...values);
      copied++;
    }
    total += copied;
    console.log(`${table}: ${copied}`);
  }
  await prisma.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 1");
  console.log(`SQLite → MySQL import complete. Rows copied/checked: ${total}`);
} catch (error) {
  try { await prisma.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 1"); } catch {}
  console.error("SQLite → MySQL import failed:", error);
  process.exitCode = 1;
} finally {
  sqlite.close();
  await prisma.$disconnect();
}
