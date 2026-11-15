import type { Client } from "@libsql/client";
import { write } from "../db/client";
import { canonical, seedFamily } from "./demo";
/** Keep signed-in demo visitors on their workspace after resetting its fixtures. */
export async function resetDemos(connection: Client) {
  const demos = await connection.execute(
    "SELECT id FROM families WHERE demo=1 ORDER BY id",
  );
  for (const row of demos.rows) {
    const family = String(row.id);
    await write(async (tx) => {
      const sessions = await tx.execute({
        sql: "SELECT s.token,s.expires,d.role FROM sessions s JOIN drivers d ON d.id=s.driver WHERE s.family=? AND s.expires>?",
        args: [family, new Date().toISOString()],
      });
      const removed = await tx.execute({
        sql: "DELETE FROM families WHERE id=? AND demo=1",
        args: [family],
      });
      if (!removed.rowsAffected) return;
      await seedFamily(tx, family);
      for (const session of sessions.rows)
        await tx.execute({
          sql: "INSERT INTO sessions(token,family,driver,expires) SELECT ?,family,id,? FROM drivers WHERE family=? AND role=?",
          args: [session.token, session.expires, family, session.role],
        });
    }, connection);
  }
  await write(async (tx) => {
    const existing = await tx.execute({
      sql: "SELECT id FROM families WHERE id=?",
      args: [canonical],
    });
    if (!existing.rows.length) await seedFamily(tx, canonical);
  }, connection);
}
