import { beforeAll, afterAll, describe, expect, it, inject, vi } from "vitest";
import { join } from "node:path";
import { connect, migrate, write } from "../src/server/db/client";
import { seedFamily } from "../src/server/providers/demo";
import { claimReceipt, decideClaim } from "../src/server/domain/claims";
import { attachEvidence } from "../src/server/domain/receipts";
import { cancelPurchase } from "../src/server/domain/purchases";
import { receiptBenefit } from "../src/server/providers/receipt-program";
import { narrate } from "../src/server/providers/ai-report";
const db = connect("file:" + join(inject("testDirectory"), "claims.db"));
beforeAll(() => migrate(db));
afterAll(() => db.close());
it("caps claim volume and spread and excludes duplicate coverage", () => {
  const p = {
    volume: 15000,
    pump: 4500000,
    fuel: "Gasoline",
    grade: "Regular 87",
    status: "posted",
    contract: null,
    at: "2025-03-01T12:00:00Z",
  };
  const calc = (
    args: Parameters<typeof receiptBenefit>[0],
    station = "Pineway Fuel",
    proof = true,
    at = "2025-03-10T12:00:00Z",
  ) => receiptBenefit(args, station, proof, at);
  expect(calc(p)).toBe(480);
  expect(calc(p, "Cedar Point")).toBe(0);
  expect(calc(p, "Pineway Fuel", false)).toBe(0);
  expect(calc({ ...p, contract: "another-protection" })).toBe(0);
  expect(calc(p, "Pineway Fuel", true, "2025-05-01T12:00:00Z")).toBe(0);
});
it("pays only an approved evidenced purchase once and reverses its claim on cancellation", async () => {
  const a = { ...(await write((tx) => seedFamily(tx), db)), role: "owner" };
  const station = String(
    (
      await db.execute({
        sql: "SELECT id FROM stations WHERE family=? AND name='Pineway Fuel'",
        args: [a.family],
      })
    ).rows[0].id,
  );
  const fields = {
    driver: a.driver,
    station,
    fuel: "Gasoline",
    grade: "Regular 87",
    volume: "12.125",
    pump: "4.249",
    at: new Date().toISOString(),
    source: "Bank record",
  };
  const { purchase } = await write((tx) => attachEvidence(tx, a, fields), db);
  await expect(
    write((tx) => claimReceipt(tx, a, purchase), db),
  ).rejects.toThrow();
  await write(
    (tx) =>
      attachEvidence(
        tx,
        a,
        { purchase },
        {
          bytes: Buffer.from("%PDF test"),
          mime: "application/pdf",
          name: "fuel.pdf",
        },
      ),
    db,
  );
  for (let i = 0; i < 2; i++)
    await write((tx) => claimReceipt(tx, a, purchase), db);
  const claims = await db.execute({
    sql: "SELECT * FROM claims WHERE family=?",
    args: [a.family],
  });
  expect(claims.rows).toHaveLength(1);
  const id = String(claims.rows[0].id);
  expect(claims.rows[0].amount).toBe(480);
  await expect(
    write((tx) => decideClaim(tx, a, id, "paid"), db),
  ).rejects.toThrow();
  await write((tx) => decideClaim(tx, a, id, "confirmed"), db);
  await write((tx) => decideClaim(tx, a, id, "paid"), db);
  await expect(
    write((tx) => decideClaim(tx, a, id, "paid"), db),
  ).rejects.toThrow();
  await write((tx) => cancelPurchase(tx, a.family, purchase), db);
  expect(
    (
      await db.execute({
        sql: "SELECT status FROM claims WHERE id=?",
        args: [id],
      })
    ).rows[0].status,
  ).toBe("reversed");
});
describe("optional AI report protocol", () => {
  it("renders only supplied ledger facts and rejects invented fact IDs", async () => {
    vi.stubEnv("OLLAMA_URL", "http://localhost:11434");
    vi.stubEnv("OLLAMA_MODEL", "test-model");
    try {
      const mock = (highlights: string[]) => async () =>
        Response.json({ message: { content: JSON.stringify({ highlights }) } });
      expect(
        await narrate(
          { budget: "Available: $80.00", net: "Net: -$1.25" },
          mock(["net", "budget"]),
        ),
      ).toEqual(["Net: -$1.25", "Available: $80.00"]);
      await expect(
        narrate({ net: "Net: -$1.25" }, mock(["net", "invented"])),
      ).rejects.toThrow();
    } finally {
      vi.unstubAllEnvs();
    }
  });
});
