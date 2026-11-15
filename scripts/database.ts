import { client, migrate, write } from "../src/server/db/client";
import { canonical, seedFamily } from "../src/server/providers/demo";
import { resetDemos } from "../src/server/providers/reset-demo";
async function main() {
  const command = process.argv[2];
  if (!["migrate", "seed", "reset"].includes(command))
    throw new Error("Unknown database command.");
  await migrate();
  if (command === "reset") await resetDemos(client);
  if (command === "seed")
    await write(async (tx) => {
      const existing = await tx.execute({
        sql: "SELECT id FROM families WHERE id=?",
        args: [canonical],
      });
      if (!existing.rows.length) await seedFamily(tx, canonical);
    });
  console.log("Database " + command + " complete.");
}
main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => client.close());
