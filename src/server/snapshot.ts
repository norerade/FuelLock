import { aiConfigured } from "./providers/ai-report";
import { eq, desc } from "drizzle-orm";
import { db as householdDatabase } from "./db/client";
import * as t from "./db/schema";
import type { Identity } from "./session";
export async function snapshot(actor: Identity, db = householdDatabase) {
  const f = actor.family;
  const [
    family,
    drivers,
    cars,
    stations,
    offers,
    contracts,
    purchases,
    receipts,
    goals,
    periods,
    claims,
  ] = await db.batch([
    db.select().from(t.families).where(eq(t.families.id, f)),
    db.select().from(t.drivers).where(eq(t.drivers.family, f)),
    db.select().from(t.cars).where(eq(t.cars.family, f)),
    db.select().from(t.stations).where(eq(t.stations.family, f)),
    db.select().from(t.offers).where(eq(t.offers.family, f)),
    db.select().from(t.contracts).where(eq(t.contracts.family, f)),
    db
      .select()
      .from(t.purchases)
      .where(eq(t.purchases.family, f))
      .orderBy(desc(t.purchases.at)),
    db.select().from(t.receipts).where(eq(t.receipts.family, f)),
    db.select().from(t.goals).where(eq(t.goals.family, f)),
    db.select().from(t.periods).where(eq(t.periods.family, f)),
    db.select().from(t.claims).where(eq(t.claims.family, f)),
  ]);
  const now = new Date().toISOString();
  return {
    actor,
    aiEnabled: aiConfigured(),
    family: family[0],
    drivers,
    cars,
    stations,
    offers: offers.map((o) => ({
      ...o,
      status:
        o.status === "published" && o.deadline < now ? "expired" : o.status,
      allowed: JSON.parse(o.allowed) as string[],
    })),
    contracts: contracts.map((c) => ({
      ...c,
      status:
        (c.status === "active" || c.status === "requested") &&
        (offers.find((o) => o.id === c.offer)?.ends ?? "") < now
          ? "expired"
          : c.status,
    })),
    purchases,
    receipts,
    goals,
    periods,
    claims,
    now,
  };
}
export type Snapshot = Awaited<ReturnType<typeof snapshot>>;
