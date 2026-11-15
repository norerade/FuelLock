import { beforeAll, afterAll, it, expect, inject } from "vitest";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { connect, migrate, write } from "../src/server/db/client";
import { resetDemos } from "../src/server/providers/reset-demo";
import { seedFamily, confirmContract } from "../src/server/providers/demo";
import { act } from "../src/server/actions";
import { redeem } from "../src/server/domain/purchases";
const db = connect("file:" + join(inject("testDirectory"), "lifecycle.db"));
beforeAll(() => migrate(db));
afterAll(() => db.close());
it("rolls back the reservation, purchase, and idempotency key after a failure", async () => {
  const a = await write((tx) => seedFamily(tx), db);
  const c = (
    await db.execute({
      sql: "SELECT c.*,o.allowed FROM contracts c JOIN offers o ON o.id=c.offer WHERE c.family=?",
      args: [a.family],
    })
  ).rows[0];
  const key = randomUUID();
  await expect(
    write(async (tx) => {
      await redeem(
        tx,
        a.family,
        {
          code: String(c.code),
          driver: a.driver,
          station: JSON.parse(String(c.allowed))[0],
          fuel: "Gasoline",
          grade: "Regular 87",
          volume: 1500,
          pump: 4000000,
        },
        key,
        1500,
      );
      throw new Error("Injected failure before commit");
    }, db),
  ).rejects.toThrow("Injected failure");
  const after = (
    await db.execute({
      sql: "SELECT available,reserved,used FROM contracts WHERE id=?",
      args: [c.id],
    })
  ).rows[0];
  expect(after).toMatchObject({
    available: c.available,
    reserved: 0,
    used: c.used,
  });
  expect(
    (
      await db.execute({
        sql: "SELECT * FROM requests WHERE key=?",
        args: [key],
      })
    ).rows,
  ).toHaveLength(0);
});
it("enforces distinct acceptance and activation deadlines and immutable agreed terms", async () => {
  const a = { ...(await write((tx) => seedFamily(tx), db)), role: "owner" };
  const offer = (
    await db.execute({
      sql: "SELECT id FROM offers WHERE family=? AND fuel='Diesel'",
      args: [a.family],
    })
  ).rows[0];
  await write((tx) => act(tx, a, "request", { id: offer.id }), db);
  const c = (
    await db.execute({
      sql: "SELECT * FROM contracts WHERE offer=?",
      args: [offer.id],
    })
  ).rows[0];
  await db.execute({
    sql: "UPDATE offers SET deadline='2000-01-01' WHERE id=?",
    args: [offer.id],
  });
  await expect(
    write((tx) => act(tx, a, "request", { id: offer.id }), db),
  ).rejects.toThrow();
  await write((tx) => confirmContract(tx, a.family, String(c.id)), db);
  await expect(
    db.execute({ sql: "UPDATE offers SET cap=0 WHERE id=?", args: [offer.id] }),
  ).rejects.toThrow("immutable");
  await expect(
    db.execute({
      sql: "UPDATE contracts SET available=available+1 WHERE id=?",
      args: [c.id],
    }),
  ).rejects.toThrow("reconcile");
});
it("resets only simulated families and preserves browser sessions by driver role", async () => {
  const a = await write((tx) => seedFamily(tx), db);
  const permanent = await write((tx) => seedFamily(tx), db);
  await db.execute({
    sql: "UPDATE families SET demo=0,name='Retained household' WHERE id=?",
    args: [permanent.family],
  });
  await db.execute({
    sql: "UPDATE families SET name='Changed demo' WHERE id=?",
    args: [a.family],
  });
  await db.execute({
    sql: "INSERT INTO sessions VALUES('test-hash',?,?,?)",
    args: [a.family, a.driver, "2099-01-01"],
  });
  await resetDemos(db);
  const active = (
    await db.execute(
      "SELECT f.name,d.role FROM sessions s JOIN families f ON f.id=s.family JOIN drivers d ON d.id=s.driver WHERE token='test-hash'",
    )
  ).rows[0];
  expect(active).toMatchObject({ name: "Morgan household", role: "owner" });
  const kept = (
    await db.execute({
      sql: "SELECT name,demo FROM families WHERE id=?",
      args: [permanent.family],
    })
  ).rows[0];
  expect(kept).toMatchObject({ name: "Retained household", demo: 0 });
  expect(
    (
      await db.execute({
        sql: "SELECT id FROM drivers WHERE id=?",
        args: [permanent.driver],
      })
    ).rows,
  ).toHaveLength(1);
});
