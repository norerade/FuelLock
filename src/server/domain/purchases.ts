import { createHash, randomUUID } from "node:crypto";
import type { Transaction } from "@libsql/client";
import { transferGoal } from "./savings";
import { cashback, quote, type OfferKind } from "./money";
import { requireThat, type Sale } from "./validation";
export const digest = (value: string | Buffer) =>
  createHash("sha256").update(value).digest("hex");
export async function preview(
  tx: Transaction,
  family: string,
  sale: Sale,
  now = new Date().toISOString(),
) {
  const row = (
    await tx.execute({
      sql: `SELECT c.*,o.kind,o.cap,o.starts,o.ends,o.allowed,o.fuel,o.grade,o.scope,d.role
    FROM contracts c JOIN offers o ON o.id=c.offer JOIN drivers d ON d.id=? AND d.family=c.family
    WHERE c.family=? AND c.code=?`,
      args: [sale.driver, family, sale.code],
    })
  ).rows[0];
  requireThat(row, "Check the contract code and driver.");
  requireThat(
    row.status === "active" &&
      String(row.starts) <= now &&
      now <= String(row.ends),
    "This contract is outside its active period.",
  );
  requireThat(
    JSON.parse(String(row.allowed)).includes(sale.station),
    "This station does not accept the contract.",
  );
  requireThat(
    row.fuel === sale.fuel && row.grade === sale.grade,
    "Fuel type and grade must match the contract.",
  );
  requireThat(
    row.scope === "household" || row.role === "owner",
    "This offer is restricted to the household owner.",
  );
  return {
    ...quote(
      row.kind as OfferKind,
      sale.volume,
      Number(row.available),
      sale.pump,
      Number(row.cap),
    ),
    contract: String(row.id),
    kind: String(row.kind),
    cap: Number(row.cap),
    pump: sale.pump,
    protectedPrice:
      row.kind === "prebuy" ? 0 : Math.min(sale.pump, Number(row.cap)),
  };
}
export function fingerprint(
  driver: string,
  station: string,
  at: string,
  fuel: string,
  grade: string,
  volume: number,
  pump: number,
) {
  return digest(
    JSON.stringify([
      driver,
      station,
      at.slice(0, 16),
      fuel,
      grade,
      volume,
      pump,
    ]),
  );
}
export async function insertPurchase(
  tx: Transaction,
  entry: {
    family: string;
    driver: string;
    station: string;
    contract: string | null;
    fuel: string;
    grade: string;
    volume: number;
    covered: number;
    pump: number;
    amount: number;
    benefit: number;
    market: number;
    at: string;
    source: string;
  },
) {
  const e = entry;

  const id = randomUUID();
  const hash = fingerprint(
    e.driver,
    e.station,
    e.at,
    e.fuel,
    e.grade,
    e.volume,
    e.pump,
  );
  await tx.execute({
    sql: `INSERT INTO purchases(id,family,driver,station,contract,fuel,grade,volume,covered,pump,amount,benefit,market,reward,reward_status,status,at,source,fingerprint,round_up,goal)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,'pending','posted',?,?,?,?,?)`,
    args: [
      id,
      e.family,
      e.driver,
      e.station,
      e.contract,
      e.fuel,
      e.grade,
      e.volume,
      e.covered,
      e.pump,
      e.amount,
      e.benefit,
      e.market,
      cashback(e.amount),
      e.at,
      e.source,
      hash,
      0,
      null,
    ],
  });
  const roundUp = (100 - (e.amount % 100)) % 100;
  const goal = await transferGoal(tx, e.family, id, "roundup", roundUp, e.at);
  if (goal)
    await tx.execute({
      sql: "UPDATE purchases SET round_up=?,goal=? WHERE id=?",
      args: [roundUp, goal, id],
    });
  return id;
}
export async function redeem(
  tx: Transaction,
  family: string,
  sale: Sale,
  key: string,
  expected: number,
  now = new Date().toISOString(),
) {
  const payload = digest(
    JSON.stringify([
      sale.code,
      sale.driver,
      sale.station,
      sale.fuel,
      sale.grade,
      sale.volume,
      sale.pump,
      expected,
    ]),
  );
  const replay = (
    await tx.execute({
      sql: "SELECT purchase,payload FROM requests WHERE family=? AND key=?",
      args: [family, key],
    })
  ).rows[0];
  if (replay) {
    requireThat(
      replay.payload === payload,
      "This request key already belongs to another purchase.",
      409,
    );
    return String(replay.purchase);
  }
  const q = await preview(tx, family, sale, now);
  requireThat(
    q.covered === expected,
    "The shared balance changed. Preview the split again.",
    409,
  );
  const hash = fingerprint(
    sale.driver,
    sale.station,
    now,
    sale.fuel,
    sale.grade,
    sale.volume,
    sale.pump,
  );
  const existing = (
    await tx.execute({
      sql: "SELECT id,contract,status FROM purchases WHERE family=? AND fingerprint=?",
      args: [family, hash],
    })
  ).rows[0];
  if (existing?.contract) {
    requireThat(
      existing.contract === q.contract && existing.status === "posted",
      "A matching purchase already exists.",
      409,
    );
    await tx.execute({
      sql: "INSERT INTO requests VALUES(?,?,?,?)",
      args: [family, key, payload, existing.id],
    });
    return String(existing.id);
  }
  if (existing)
    requireThat(
      existing.status === "posted",
      "A matching purchase has been cancelled.",
      409,
    );
  const update = await tx.execute({
    sql: "UPDATE contracts SET available=available-?,reserved=reserved+? WHERE id=? AND available>=?",
    args: [q.covered, q.covered, q.contract, q.covered],
  });
  requireThat(
    update.rowsAffected === 1,
    "The shared balance changed. Preview again.",
    409,
  );
  let id: string;
  if (existing) {
    id = String(existing.id);
    await tx.execute({
      sql: "UPDATE claims SET status=\'reversed\' WHERE purchase=?",
      args: [id],
    });
    await tx.execute({
      sql: `UPDATE purchases SET contract=?, covered=?,amount=?,benefit=?,market=?,reward=?,round_up=CASE WHEN goal IS NULL THEN 0 ELSE MIN(round_up,(100-?%100)%100) END,source='Partner + receipt' WHERE id=?`,
      args: [
        q.contract,
        q.covered,
        q.fuel,
        q.benefit,
        q.market,
        cashback(q.fuel),
        q.fuel,
        id,
      ],
    });
  } else {
    id = await insertPurchase(tx, {
      ...sale,
      family,
      contract: q.contract,
      covered: q.covered,
      amount: q.fuel,
      benefit: q.benefit,
      market: q.market,
      at: now,
      source: "Partner console",
    });
  }
  await tx.execute({
    sql: "UPDATE contracts SET reserved=reserved-?,used=used+? WHERE id=?",
    args: [q.covered, q.covered, q.contract],
  });
  await tx.execute({
    sql: "INSERT INTO requests VALUES(?,?,?,?)",
    args: [family, key, payload, id],
  });
  return id;
}
export async function cancelPurchase(
  tx: Transaction,
  family: string,
  id: string,
) {
  const p = (
    await tx.execute({
      sql: "SELECT * FROM purchases WHERE family=? AND id=?",
      args: [family, id],
    })
  ).rows[0];
  requireThat(p, "Purchase not found.", 404);
  if (p.status === "cancelled") return;
  await tx.execute({
    sql: "UPDATE purchases SET status='cancelled',reward_status='reversed' WHERE id=?",
    args: [id],
  });
  if (p.contract)
    await tx.execute({
      sql: "UPDATE contracts SET available=available+?, used=used-? WHERE id=?",
      args: [p.covered, p.covered, p.contract],
    });
  await tx.execute({
    sql: "UPDATE claims SET status='reversed' WHERE purchase=?",
    args: [id],
  });
}
