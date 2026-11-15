import { randomUUID } from "node:crypto";
import type { Transaction } from "@libsql/client";
import type { Identity } from "../session";
import { receiptBenefit, receiptProgram } from "../providers/receipt-program";
import { requireThat } from "./validation";
export async function claimReceipt(
  tx: Transaction,
  a: Identity,
  id: string,
  now = new Date().toISOString(),
) {
  const p = (
    await tx.execute({
      sql: `SELECT p.*,s.name station_name,EXISTS(SELECT 1 FROM receipts r WHERE r.purchase=p.id) has_proof
  FROM purchases p JOIN stations s ON s.id=p.station WHERE p.family=? AND p.id=?`,
      args: [a.family, id],
    })
  ).rows[0];
  requireThat(
    p && (a.role === "owner" || p.driver === a.driver),
    "Fill-up unavailable.",
    404,
  );
  const amount = receiptBenefit(
    {
      volume: Number(p.volume),
      pump: Number(p.pump),
      fuel: String(p.fuel),
      grade: String(p.grade),
      at: String(p.at),
      status: String(p.status),
      contract: p.contract ? String(p.contract) : null,
    },
    String(p.station_name),
    Boolean(p.has_proof),
    now,
  );
  requireThat(
    amount > 0,
    "This receipt does not meet the published program terms.",
  );
  await tx.execute({
    sql: "INSERT INTO claims(id,family,purchase,amount,status,at,version) VALUES(?,?,?,?,'pending',?,?) ON CONFLICT(purchase) DO NOTHING",
    args: [randomUUID(), a.family, id, amount, now, receiptProgram.version],
  });
  return { message: "Receipt claim submitted for partner review." };
}
export async function decideClaim(
  tx: Transaction,
  a: Identity,
  id: string,
  next: "confirmed" | "rejected" | "paid",
  now = new Date().toISOString(),
) {
  requireThat(
    a.role === "owner",
    "Only the partner simulator can settle claims.",
    403,
  );
  const prior = next === "paid" ? "confirmed" : "pending";
  const changed = await tx.execute({
    sql: `UPDATE claims SET status=?,decided=COALESCE(decided,?),paid=CASE WHEN ?='paid' THEN ? ELSE NULL END
  WHERE family=? AND id=? AND status=? AND EXISTS(SELECT 1 FROM purchases WHERE purchases.id=claims.purchase AND purchases.status='posted' AND purchases.contract IS NULL)`,
    args: [next, now, next, now, a.family, id, prior],
  });
  requireThat(
    changed.rowsAffected === 1,
    "This claim has already changed or its purchase was reversed.",
    409,
  );
  return { message: "Claim " + next + "." };
}
