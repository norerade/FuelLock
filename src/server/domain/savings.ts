import type { Transaction } from "@libsql/client";

/** Reserve the full transfer or skip it. The caller's write transaction also posts the purchase or reward. */
export async function transferGoal(
  tx: Transaction,
  family: string,
  purchase: string,
  kind: "roundup" | "cashback",
  amount: number,
  at: string,
) {
  if (amount <= 0) return null;
  const result = await tx.execute({
    sql: `SELECT g.id, f.transfer_limit, f.minimum_balance,
      COALESCE((SELECT budget FROM periods WHERE family=f.id AND month=?2),f.budget) AS budget,
      (SELECT COALESCE(sum(amount),0) FROM purchases WHERE family=f.id AND status='posted' AND substr(at,1,7)=?2) AS pump,
      (SELECT COALESCE(sum(o.fee+o.service+CASE WHEN o.kind='prebuy' THEN (o.volume*o.cap+5000000)/10000000 ELSE 0 END),0)
       FROM contracts c JOIN offers o ON o.id=c.offer WHERE c.family=f.id AND substr(c.activated,1,7)=?2) AS agreements,
      (SELECT COALESCE(sum(amount),0) FROM savings_transfers WHERE family=f.id AND substr(at,1,7)=?2
       AND NOT(purchase=?3 AND kind=?4)) AS allocated
      FROM families f JOIN goals g ON g.family=f.id
      WHERE f.id=?1 AND f.transfer_consent=1 AND f.transfers_paused=0
      AND CASE WHEN ?4='roundup' THEN g.auto ELSE g.cashback END=1`,
    args: [family, at.slice(0, 7), purchase, kind],
  });
  const row = result.rows[0];
  if (!row) return null;
  const after = Number(row.allocated) + amount;
  if (
    after > Number(row.transfer_limit) ||
    Number(row.budget) - Number(row.pump) - Number(row.agreements) - after <
      Number(row.minimum_balance)
  )
    return null;
  return String(row.id);
}
