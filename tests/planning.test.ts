import { beforeAll, afterAll, describe, expect, it, inject } from "vitest";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "../src/server/db/schema";
import { connect, migrate, write } from "../src/server/db/client";
import { snapshot } from "../src/server/snapshot";
import { seedFamily } from "../src/server/providers/demo";
import { act } from "../src/server/actions";
import { rankStations } from "../src/server/domain/trips";
import { report } from "../src/server/domain/report";
import { redeem, cancelPurchase } from "../src/server/domain/purchases";
const db = connect("file:" + join(inject("testDirectory"), "planning.db"));
const orm = drizzle(db, { schema });
beforeAll(() => migrate(db));
afterAll(() => db.close());
async function family() {
  const a = await write((tx) => seedFamily(tx), db);
  return { ...a, role: "owner" };
}
describe("planning and rewards", () => {
  it("charges physical pre-buy gallons once and restores them on cancellation", async () => {
    const a = await family();
    let s = await snapshot(a, orm);
    const o = s.offers.find((o) => o.kind === "prebuy")!;
    await write((tx) => act(tx, a, "request", { id: o.id }), db);
    s = await snapshot(a, orm);
    const c = s.contracts.find((c) => c.offer === o.id)!;
    expect(c.status).toBe("requested");
    expect(report(s, s.now.slice(0, 7)).upfront).toBe(0);
    await write((tx) => act(tx, a, "activate", { id: c.id }), db);
    const id = await write(
      (tx) =>
        redeem(
          tx,
          a.family,
          {
            code: c.code,
            driver: a.driver,
            station: o.allowed[0],
            fuel: "Gasoline",
            grade: "Regular 87",
            volume: 30000,
            pump: 4000000,
          },
          randomUUID(),
          25000,
        ),
      db,
    );
    s = await snapshot(a, orm);
    expect(s.purchases.find((p) => p.id === id)?.amount).toBe(2000);
    expect(report(s, s.now.slice(0, 7)).upfront).toBe(7998);
    await write((tx) => cancelPurchase(tx, a.family, id), db);
    s = await snapshot(a, orm);
    expect(s.contracts.find((p) => p.id === c.id)?.available).toBe(25000);
    expect(report(s, s.now.slice(0, 7)).upfront).toBe(7998);
  });
  it("ranks stations by eligible cash cost and vehicle detour", async () => {
    const a = await family();
    const s = await snapshot(a, orm);
    const car = s.cars.find((c) => c.fuel === "Gasoline")!;
    const commute = rankStations(s, "commute", car.id, 12000),
      school = rankStations(s, "school", car.id, 12000);
    expect(commute[0].station.name).toBe("Pineway Fuel");
    expect(school[0].station.name).toBe("Northline Station");
    expect(commute[0].detourCost).toBe(11);
    const diesel = s.cars.find((c) => c.fuel === "Diesel")!;
    expect(
      rankStations(s, "commute", diesel.id, 12000).every(
        (r) => r.covered === 0,
      ),
    ).toBe(true);
  });
  it("routes paid cashback once and prevents duplicate transitions or foreign goals", async () => {
    const a = await family();
    let s = await snapshot(a, orm);
    const goal = s.goals[0],
      p = s.purchases.find((p) => p.rewardStatus === "pending")!;
    await write(
      (tx) => act(tx, a, "rules", { roundup: "", cashback: goal.id }),
      db,
    );
    for (const stage of ["pending", "confirmed"])
      await write((tx) => act(tx, a, "reward", { id: p.id, stage }), db);
    await expect(
      write((tx) => act(tx, a, "reward", { id: p.id, stage: "confirmed" }), db),
    ).rejects.toThrow();
    await expect(
      write(
        (tx) =>
          act(tx, a, "rules", { roundup: "other-family-goal", cashback: "" }),
        db,
      ),
    ).rejects.toThrow();
    s = await snapshot(a, orm);
    expect(s.purchases.find((row) => row.id === p.id)?.rewardGoal).toBe(
      goal.id,
    );
    await expect(
      write((tx) => act(tx, { ...a, role: "driver" }, "settings", {}), db),
    ).rejects.toThrow();
  });
});
