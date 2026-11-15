import { createClient, type Client, type Transaction } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { mkdirSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import * as schema from "./schema";
export function connect(
  url = process.env.DATABASE_URL ||
    process.env.TURSO_DATABASE_URL ||
    "file:data/fuellock.db",
) {
  if (url.startsWith("file:"))
    mkdirSync(dirname(url.slice(5)), { recursive: true });
  return createClient({
    url,
    authToken: process.env.DATABASE_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN,
  });
}
const shared = globalThis as typeof globalThis & {
  fuelClient?: Client;
  fuelMigration?: Promise<void>;
};
export const client = (shared.fuelClient ??= connect());
export const db = drizzle(client, { schema });
export async function write<T>(
  work: (tx: Transaction) => Promise<T>,
  connection = client,
): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    let tx: Transaction | undefined;
    try {
      tx = await connection.transaction("write");
      const value = await work(tx);
      await tx.commit();
      return value;
    } catch (error) {
      if (tx && !tx.closed) await tx.rollback();
      if (attempt >= 5 || !String(error).includes("SQLITE_BUSY")) throw error;
      await new Promise((r) => setTimeout(r, 30 * (attempt + 1)));
    } finally {
      tx?.close();
    }
  }
}
export async function migrate(connection = client) {
  if (connection.protocol === "file")
    await connection.execute("PRAGMA journal_mode=WAL");
  await connection.execute("PRAGMA foreign_keys=ON");
  await connection.execute(
    "CREATE TABLE IF NOT EXISTS migrations (name TEXT PRIMARY KEY)",
  );
  for (const name of readdirSync(join(process.cwd(), "migrations"))
    .filter((n) => n.endsWith(".sql"))
    .sort()) {
    await write(async (tx) => {
      const exists = await tx.execute({
        sql: "SELECT name FROM migrations WHERE name=?",
        args: [name],
      });
      if (exists.rows.length) return;
      await tx.executeMultiple(
        readFileSync(join(process.cwd(), "migrations", name), "utf8"),
      );
      await tx.execute({
        sql: "INSERT INTO migrations VALUES (?)",
        args: [name],
      });
    }, connection);
  }
}
export function ready() {
  return (shared.fuelMigration ??= migrate().catch((error) => {
    shared.fuelMigration = undefined;
    throw error;
  }));
}
