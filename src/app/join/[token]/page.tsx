import Link from "next/link";
import { client, ready } from "@/server/db/client";
export default async function Join({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  await ready();
  const row = (
    await client.execute({
      sql: "SELECT d.name driver,f.name family FROM invites i JOIN families f ON f.id=i.family JOIN drivers d ON d.id=i.driver WHERE i.id=? AND i.used=0 AND i.expires>?",
      args: [token, new Date().toISOString()],
    })
  ).rows[0];
  return (
    <main className="entry-card">
      <span className="brand">FuelLock</span>
      <h1>{row ? "Join your household" : "Invitation unavailable"}</h1>
      {row ? (
        <form method="post" action="/api/session/join">
          <p>
            Join {String(row.family)} as {String(row.driver)} to see shared fuel
            balances and purchases.
          </p>
          <input type="hidden" name="token" value={token} />
          <button className="primary">Accept invitation</button>
        </form>
      ) : (
        <p>Ask the household owner for a fresh link.</p>
      )}
      <Link className="text-link" href="/overview">
        Back to overview
      </Link>
    </main>
  );
}
