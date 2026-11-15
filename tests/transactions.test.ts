import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { inject } from "vitest";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { connect, migrate, write } from "../src/server/db/client";
import { seedFamily } from "../src/server/providers/demo";
import {
  cancelPurchase,
  preview,
  redeem,
} from "../src/server/domain/purchases";
import { attachEvidence } from "../src/server/domain/receipts";
import type { Sale } from "../src/server/domain/validation";
const folder = inject("testDirectory");
const db = connect("file:" + join(folder, "test.db"));
const now = "2025-11-15T14:00:00.000Z";
beforeAll(() => migrate(db));
afterAll(() => db.close());
async function setup() {
  const a = await write(
    (tx) => seedFamily(tx, randomUUID(), new Date(now)),
    db,
  );
  const c = (
    await db.execute({
      sql: "SELECT * FROM contracts WHERE family=?",
      args: [a.family],
    })
  ).rows[0];
  const station = (
    await db.execute({
      sql: "SELECT id FROM stations WHERE family=? ORDER BY mile",
      args: [a.family],
    })
  ).rows[0];
  const sale: Sale = {
    code: String(c.code),
    driver: a.driver,
    station: String(station.id),
    fuel: "Gasoline",
    grade: "Regular 87",
    volume: 40000,
    pump: 3999000,
  };
  return { ...a, c, sale, available: Number(c.available) };
}
describe("household transaction boundary", () => {
  it("rejects mismatched fuel, scope, station, driver and dates", async () => {
    const { family, c, sale } = await setup();
    for (const change of [
      { fuel: "Diesel" as const },
      { grade: "Ultra-low sulfur" as const },
      { station: "elsewhere" },
      { driver: "other" },
    ])
      await expect(
        write((tx) => preview(tx, family, { ...sale, ...change }, now), db),
      ).rejects.toThrow();
    await expect(
      write((tx) => preview(tx, family, sale, "2099-01-01T00:00:00.000Z"), db),
    ).rejects.toThrow();
    await db.execute({
      sql: "UPDATE offers SET deadline='2000-01-01' WHERE id=?",
      args: [c.offer],
    });
    expect(
      await write((tx) => preview(tx, family, sale, now), db),
    ).toMatchObject({ covered: 33800 });
  });
  it("does not sell the last gallons twice and replays the original result", async () => {
    const { family, sale, available, c } = await setup();
    const second = String(
      (
        await db.execute({
          sql: "SELECT id FROM drivers WHERE family=? AND role='driver'",
          args: [family],
        })
      ).rows[0].id,
    );
    const keys = [randomUUID(), randomUUID()];
    const sales = [sale, { ...sale, driver: second }];
    const results = await Promise.allSettled(
      sales.map((s, i) =>
        write((tx) => redeem(tx, family, s, keys[i], available, now), db),
      ),
    );
    const win = results.findIndex((x) => x.status === "fulfilled");
    expect(win).toBeGreaterThan(-1);
    expect(results.filter((x) => x.status === "fulfilled")).toHaveLength(1);
    const id = await write(
      (tx) => redeem(tx, family, sales[win], keys[win], available, now),
      db,
    );
    expect(id).toBe((results[win] as PromiseFulfilledResult<string>).value);
    await expect(
      write(
        (tx) =>
          redeem(
            tx,
            family,
            { ...sales[win], pump: 3500000 },
            keys[win],
            available,
            now,
          ),
        db,
      ),
    ).rejects.toThrow();
    for (let i = 0; i < 2; i++)
      await write((tx) => cancelPurchase(tx, family, id), db);
    const updated = (
      await db.execute({
        sql: "SELECT * FROM contracts WHERE id=?",
        args: [c.id],
      })
    ).rows[0];
    expect(updated.available).toBe(available);
    expect(updated.reserved).toBe(0);
    expect(
      (
        await db.execute({
          sql: "SELECT reward_status FROM purchases WHERE id=?",
          args: [id],
        })
      ).rows[0].reward_status,
    ).toBe("reversed");
  });
  it("merges bank, receipt and partner evidence into the same fill-up", async () => {
    const { family, driver, sale } = await setup();
    const actor = { family, driver, role: "owner" };
    const fields = {
      ...sale,
      at: now,
      volume: "2.5",
      pump: "3.999",
      source: "Bank record",
    };
    const bank = await write((tx) => attachEvidence(tx, actor, fields), db);
    const evidence = {
      name: "receipt.pdf",
      mime: "application/pdf",
      bytes: Buffer.from("%PDF-proof"),
    };
    const receipt = await write(
      (tx) =>
        attachEvidence(tx, actor, { ...fields, source: "Receipt" }, evidence),
      db,
    );
    expect(receipt.purchase).toBe(bank.purchase);
    expect(
      (
        await write(
          (tx) =>
            attachEvidence(tx, actor, { purchase: bank.purchase }, evidence),
          db,
        )
      ).purchase,
    ).toBe(bank.purchase);
    expect(
      await write(
        (tx) =>
          redeem(
            tx,
            family,
            { ...sale, volume: 2500 },
            randomUUID(),
            2500,
            now,
          ),
        db,
      ),
    ).toBe(bank.purchase);
    expect(
      (
        await db.execute({
          sql: "SELECT count(*) n FROM receipts WHERE family=?",
          args: [family],
        })
      ).rows[0].n,
    ).toBe(1);
  });
});
