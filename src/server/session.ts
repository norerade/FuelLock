import { cookies } from "next/headers";
import { randomBytes } from "node:crypto";
import type { Transaction } from "@libsql/client";
import { client, ready } from "./db/client";
import { digest } from "./domain/purchases";
import { Problem } from "./domain/validation";
export async function identity() {
  const jar = await cookies();
  const token = jar.get("fuellock_session")?.value;
  if (!token) return null;
  await ready();
  const row = (
    await client.execute({
      sql: `SELECT s.family, COALESCE(persona.id,d.id) AS driver, COALESCE(persona.role,d.role) AS role,
        (f.demo=1 AND d.role='owner') AS can_switch
        FROM sessions s JOIN families f ON f.id=s.family JOIN drivers d ON d.id=s.driver AND d.family=s.family
        LEFT JOIN drivers persona ON f.demo=1 AND d.role='owner' AND persona.family=s.family AND persona.role='driver' AND persona.id=?
        WHERE s.token=? AND s.expires>?`,
      args: [
        jar.get("fuellock_persona")?.value ?? "",
        digest(token),
        new Date().toISOString(),
      ],
    })
  ).rows[0];
  return row
    ? {
        family: String(row.family),
        driver: String(row.driver),
        role: String(row.role),
        canSwitchPersona: !!row.can_switch,
      }
    : null;
}
export type Identity = {
  family: string;
  driver: string;
  role: string;
  canSwitchPersona?: boolean;
};
export async function newSession(
  tx: Transaction,
  family: string,
  driver: string,
) {
  const token = randomBytes(32).toString("hex");
  await tx.execute({
    sql: "INSERT INTO sessions VALUES(?,?,?,?)",
    args: [
      digest(token),
      family,
      driver,
      new Date(Date.now() + 30 * 86400000).toISOString(),
    ],
  });
  return token;
}
export function verifyOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (
    request.headers.get("sec-fetch-site") === "cross-site" ||
    (origin &&
      new URL(origin).host !== new URL(request.url).host &&
      new URL(origin).host !== request.headers.get("host"))
  )
    throw new Problem("Cross-site request refused.", 403);
}
export const sessionOptions = (request: Request) => ({
  httpOnly: true,
  sameSite: "lax" as const,
  secure:
    process.env.NODE_ENV === "production" &&
    new URL(request.url).protocol === "https:",
  path: "/",
  maxAge: 30 * 86400,
});
