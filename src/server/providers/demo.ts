import { randomUUID, randomBytes } from "node:crypto";
import type { Transaction } from "@libsql/client";
import {
  cancelPurchase,
  digest,
  insertPurchase,
  redeem,
} from "../domain/purchases";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { lineCents } from "../domain/money";
import { requireThat } from "../domain/validation";
export const code = () => "FL-" + randomBytes(4).toString("hex").toUpperCase();
export const canonical = "sample-household";
export async function seedFamily(
  tx: Transaction,
  id = randomUUID() as string,
  now = new Date(),
) {
  const iso = now.toISOString();
  const month = iso.slice(0, 7);
  const start = month + "-01T00:00:00.000Z";
  const prior = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1),
  ).toISOString();
  const later = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 2, 0, 23, 59, 59),
  ).toISOString();
  const until = new Date(now.getTime() + 14 * 86400000).toISOString();
  const owner = randomUUID(),
    member = randomUUID();
  await tx.execute({
    sql: "INSERT INTO families(id,name,budget,plan,demo,created,next_payday) VALUES(?,?,?,'Family',1,?,?)",
    args: [id, "Morgan household", 32000, iso, until.slice(0, 10)],
  });
  for (const [driver, name, role] of [
    [owner, "Alex Morgan", "owner"],
    [member, "Jamie Morgan", "driver"],
  ])
    await tx.execute({
      sql: "INSERT INTO drivers VALUES(?,?,?,?)",
      args: [driver, id, name, role],
    });
  await tx.execute({
    sql: "INSERT INTO invites(id,family,driver,expires,used) VALUES(?,?,?,?,0)",
    args: [
      randomBytes(24).toString("hex"),
      id,
      member,
      new Date(now.getTime() + 86400000).toISOString(),
    ],
  });
  for (const [name, fuel, mpg] of [
    ["Subaru Outback", "Gasoline", 28],
    ["VW Golf TDI", "Diesel", 36],
  ])
    await tx.execute({
      sql: "INSERT INTO cars VALUES(?,?,?,?,?)",
      args: [randomUUID(), id, name, fuel, mpg],
    });
  for (const period of [month, prior.slice(0, 7)])
    await tx.execute({
      sql: "INSERT INTO periods VALUES(?,?,?,?)",
      args: [randomUUID(), id, period, 32000],
    });
  const stationIds = [randomUUID(), randomUUID(), randomUUID()];
  const locations = [
    ["Pineway Fuel", "104 Oak Avenue", 3899000, 4099000, 2],
    ["Northline Station", "820 Market Street", 3799000, 4049000, 5],
    ["Cedar Point", "36 Lake Road", 3999000, 4199000, 9],
  ];
  for (const [index, location] of locations.entries())
    await tx.execute({
      sql: "INSERT INTO stations VALUES(?,?,?,?,?,?,?)",
      args: [stationIds[index], id, ...location],
    });
  const offerIds = [randomUUID(), randomUUID(), randomUUID(), randomUUID()];
  const options = [
    [
      "Everyday Gas Lock",
      "Pineway Energy",
      "lock",
      "Gasoline",
      "Regular 87",
      3299000,
      80000,
      350,
      50,
    ],
    [
      "Diesel Family Lock",
      "Northline Co-op",
      "lock",
      "Diesel",
      "Ultra-low sulfur",
      3499000,
      60000,
      200,
      40,
    ],
    [
      "Pineway Pre-buy",
      "Pineway Energy",
      "prebuy",
      "Gasoline",
      "Regular 87",
      3199000,
      25000,
      0,
      0,
    ],
    [
      "Commuter Gas Lock",
      "Cedar Motor Fuels",
      "lock",
      "Gasoline",
      "Regular 87",
      3399000,
      40000,
      150,
      25,
    ],
  ];
  for (const [i, offer] of options.entries())
    await tx.execute({
      sql: "INSERT INTO offers VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
      args: [
        offerIds[i],
        id,
        ...offer,
        until,
        prior,
        later,
        JSON.stringify(
          i === 0
            ? stationIds.slice(0, 2)
            : i === 2
              ? [stationIds[0]]
              : stationIds,
        ),
        i === 3 ? "owner" : "household",
        i === 2
          ? "Unused physical gallons expire at term end. Non-refundable after partner activation."
          : "Pay the lower of the posted pump price and the cap on eligible gallons. Unused protection expires at term end.",
        "2026.1",
        "Simulated partner",
        "published",
      ],
    });
  const contract = randomUUID(),
    redemptionCode = code();
  await tx.execute({
    sql: "INSERT INTO contracts VALUES(?,?,?,?,'requested',80000,0,0,NULL)",
    args: [contract, id, offerIds[0], redemptionCode],
  });
  await confirmContract(tx, id, contract, start);
  await tx.execute({
    sql: "INSERT INTO goals(id,family,name,target,auto) VALUES(?,?,?,?,1)",
    args: [randomUUID(), id, "Summer road trip", 25000],
  });
  const elapsed = Math.max(1, now.getTime() - Date.parse(start));
  for (const [i, v] of [8200, 12400, 6900, 10300, 8400].entries()) {
    const at = new Date(
      Date.parse(start) + Math.floor((elapsed * (i + 1)) / 6),
    ).toISOString();
    const purchase = await redeem(
      tx,
      id,
      {
        code: redemptionCode,
        driver: i % 2 ? member : owner,
        station: stationIds[i % 2],
        fuel: "Gasoline",
        grade: "Regular 87",
        volume: v,
        pump: [3699000, 3799000, 3849000, 3899000, 3799000][i],
      },
      randomUUID(),
      v,
      at,
    );
    if (i < 4)
      await tx.execute({
        sql: "UPDATE purchases SET reward_status=? WHERE id=?",
        args: [i < 3 ? "paid" : "confirmed", purchase],
      });
  }
  for (const [index, status] of [
    "posted",
    "needs_review",
    "cancelled",
  ].entries()) {
    const volume = 6000 + index * 1000,
      pump = 3999000;
    const amount = lineCents(volume, pump);
    const purchase = await insertPurchase(tx, {
      family: id,
      driver: member,
      station: stationIds[2],
      contract: null,
      fuel: "Gasoline",
      grade: "Regular 87",
      volume,
      covered: 0,
      pump,
      amount,
      benefit: 0,
      market: amount,
      at: start,
      source: status === "posted" ? "Receipt" : "Bank record",
    });
    if (status === "posted") {
      const content = readFileSync(
        join(process.cwd(), "public/images/demo-receipt.png"),
      );
      await tx.execute({
        sql: "INSERT INTO receipts VALUES(?,?,?,?,?,?,?)",
        args: [
          randomUUID(),
          id,
          purchase,
          digest(content),
          "cedar-point-demo.png",
          "image/png",
          content,
        ],
      });
    } else if (status === "cancelled") {
      await cancelPurchase(tx, id, purchase);
    } else {
      await tx.execute({
        sql: "UPDATE purchases SET status='needs_review',reward_status='not accrued',round_up=0,goal=NULL WHERE id=?",
        args: [purchase],
      });
    }
  }
  // Historical simulated transfers only. New transfers require the owner's own opt-in.
  await tx.execute({
    sql: `UPDATE purchases SET round_up=(100-amount%100)%100,goal=(SELECT id FROM goals WHERE family=?)
    WHERE family=? AND status='posted' AND reward_status='paid'`,
    args: [id, id],
  });
  await tx.execute({
    sql: `UPDATE purchases SET reward_goal=(SELECT id FROM goals WHERE family=?),reward_transfer_at=at
    WHERE family=? AND status='posted' AND reward_status='confirmed'`,
    args: [id, id],
  });
  return { family: id, driver: owner };
}
export async function confirmContract(
  tx: Transaction,
  family: string,
  id: string,
  now = new Date().toISOString(),
) {
  const row = (
    await tx.execute({
      sql: "SELECT c.status,o.status offer_status,o.ends FROM contracts c JOIN offers o ON o.id=c.offer WHERE c.id=? AND c.family=?",
      args: [id, family],
    })
  ).rows[0];
  requireThat(row, "Contract not found.", 404);
  if (row.status === "active") return;
  requireThat(
    row.status === "requested" &&
      row.offer_status === "published" &&
      now <= String(row.ends),
    "This request can no longer be activated.",
  );
  await tx.execute({
    sql: "UPDATE contracts SET status='active',activated=? WHERE id=?",
    args: [now, id],
  });
}
