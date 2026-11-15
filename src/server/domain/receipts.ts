import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { Transaction } from "@libsql/client";
import type { Identity } from "../session";
import { digest, fingerprint, insertPurchase } from "./purchases";
import { lineCents } from "./money";
import { qty, price, fuelType, requireThat } from "./validation";
export async function attachEvidence(
  tx: Transaction,
  a: Identity,
  fields: Record<string, string>,
  file?: { bytes: Buffer; mime: string; name: string },
) {
  const hash = file ? digest(file.bytes) : null;
  if (hash) {
    const exists = (
      await tx.execute({
        sql: "SELECT r.purchase,p.driver FROM receipts r JOIN purchases p ON p.id=r.purchase WHERE r.family=? AND r.hash=?",
        args: [a.family, hash],
      })
    ).rows[0];
    if (exists) {
      requireThat(
        a.role === "owner" || exists.driver === a.driver,
        "This receipt belongs to another driver.",
        403,
      );
      requireThat(
        !fields.purchase || exists.purchase === fields.purchase,
        "This file is already attached to another fill-up.",
        409,
      );
      return {
        purchase: String(exists.purchase),
        message: "Receipt already linked. No duplicate fill-up.",
      };
    }
  }
  let purchase = fields.purchase;
  if (purchase) {
    requireThat(file, "Choose a receipt file.");
    const p = (
      await tx.execute({
        sql: "SELECT driver,status FROM purchases WHERE family=? AND id=?",
        args: [a.family, purchase],
      })
    ).rows[0];
    requireThat(
      p &&
        (p.driver === a.driver || a.role === "owner") &&
        p.status === "posted",
      "Select an eligible fill-up.",
    );
  } else {
    const input = z
      .object({
        driver: z.string(),
        station: z.string(),
        fuel: fuelType,
        grade: z.enum(["Regular 87", "Ultra-low sulfur"]),
        volume: qty,
        pump: price,
        at: z.iso.datetime(),
        source: z.enum(["Receipt", "Bank record"]),
      })
      .parse(fields);
    requireThat(
      input.source === "Bank record" || file,
      "Choose a receipt file.",
    );
    requireThat(
      (input.fuel === "Gasoline") === (input.grade === "Regular 87"),
      "Select the matching fuel grade.",
    );
    requireThat(
      input.at <= new Date(Date.now() + 60000).toISOString(),
      "Purchase time cannot be in the future.",
    );
    const valid = (
      await tx.execute({
        sql: "SELECT d.id FROM drivers d JOIN stations s ON s.family=d.family WHERE d.family=? AND d.id=? AND s.id=?",
        args: [a.family, input.driver, input.station],
      })
    ).rows[0];
    requireThat(
      valid && (a.role === "owner" || input.driver === a.driver),
      "Station or driver is unavailable.",
    );
    const hashFields = fingerprint(
      input.driver,
      input.station,
      input.at,
      input.fuel,
      input.grade,
      input.volume,
      input.pump,
    );
    const existing = (
      await tx.execute({
        sql: "SELECT id,status FROM purchases WHERE family=? AND fingerprint=?",
        args: [a.family, hashFields],
      })
    ).rows[0];
    if (existing) {
      requireThat(
        existing.status === "posted",
        "The matching fill-up was cancelled.",
      );
      purchase = String(existing.id);
    } else {
      const amount = lineCents(input.volume, input.pump);
      purchase = await insertPurchase(tx, {
        ...input,
        family: a.family,
        contract: null,
        covered: 0,
        amount,
        benefit: 0,
        market: amount,
      });
    }
  }
  if (file && hash)
    await tx.execute({
      sql: "INSERT INTO receipts VALUES(?,?,?,?,?,?,?)",
      args: [
        randomUUID(),
        a.family,
        purchase,
        hash,
        file.name.slice(0, 120),
        file.mime,
        file.bytes,
      ],
    });
  return {
    purchase,
    message: file ? "Receipt linked to the fill-up." : "Bank record saved.",
  };
}
