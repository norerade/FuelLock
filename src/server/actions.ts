import { randomBytes, randomUUID } from "node:crypto";
import { z } from "zod";
import type { Transaction } from "@libsql/client";
import type { Identity } from "./session";
import {
  dollars,
  label,
  saleInput,
  fuelType,
  requireThat,
  Problem,
} from "./domain/validation";
import { transferGoal } from "./domain/savings";
import { preview, redeem, cancelPurchase } from "./domain/purchases";
import { claimReceipt, decideClaim } from "./domain/claims";
import { addGoal, updateRules, settings } from "./domain/preferences";
import { code, confirmContract } from "./providers/demo";
const id = z.string().min(1).max(100);
const monthInput = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);
export async function act(
  tx: Transaction,
  a: Identity,
  action: string,
  input: Record<string, unknown>,
) {
  const now = new Date().toISOString(),
    family = a.family;
  const owner = () =>
    requireThat(
      a.role === "owner",
      "Only the household owner can perform this action.",
      403,
    );
  switch (action) {
    case "claim":
      return claimReceipt(tx, a, id.parse(input.id));
    case "claimDecision":
      return decideClaim(
        tx,
        a,
        id.parse(input.id),
        z.enum(["confirmed", "rejected", "paid"]).parse(input.next),
      );
    case "closeContract": {
      owner();
      const change = await tx.execute({
        sql: "UPDATE contracts SET status='cancelled' WHERE family=? AND id=? AND status='active'",
        args: [family, id.parse(input.id)],
      });
      requireThat(change.rowsAffected, "This contract is already closed.", 409);
      return { message: "Contract closed." };
    }
    case "goal":
      return addGoal(tx, a, input);
    case "rules":
      return updateRules(tx, a, input);
    case "settings":
      return settings(tx, a, input);
    case "request": {
      owner();
      const offer = (
        await tx.execute({
          sql: "SELECT * FROM offers WHERE family=? AND id=?",
          args: [family, id.parse(input.id)],
        })
      ).rows[0];
      requireThat(
        offer &&
          offer.status === "published" &&
          String(offer.deadline) >= now &&
          String(offer.ends) >= now,
        "This offer is no longer open.",
      );
      await tx.execute({
        sql: "INSERT INTO contracts(id,family,offer,code,status,available,reserved,used) VALUES(?,?,?,?,'requested',?,0,0) ON CONFLICT(family,offer) DO NOTHING",
        args: [randomUUID(), family, offer.id, code(), offer.volume],
      });
      return { message: "Request sent to the simulated partner." };
    }
    case "activate":
      owner();
      await confirmContract(tx, family, id.parse(input.id));
      return { message: "Contract activated." };
    case "withdraw": {
      owner();
      const change = await tx.execute({
        sql: "UPDATE contracts SET status='cancelled' WHERE family=? AND id=? AND status='requested'",
        args: [family, id.parse(input.id)],
      });
      requireThat(
        change.rowsAffected,
        "Only pending requests can be withdrawn.",
      );
      return { message: "Request withdrawn." };
    }
    case "preview":
      owner();
      return { quote: await preview(tx, family, saleInput.parse(input)) };
    case "redeem": {
      owner();
      const purchase = await redeem(
        tx,
        family,
        saleInput.parse(input),
        z.uuid().parse(input.key),
        z.number().int().nonnegative().parse(input.expected),
      );
      return {
        purchase,
        message: "Fill-up recorded. The household balance is updated.",
      };
    }
    case "cancel":
      owner();
      await cancelPurchase(tx, family, id.parse(input.id));
      return { message: "Fill-up cancelled and balance restored." };
    case "reward": {
      owner();
      const p = id.parse(input.id);
      const stage = z.enum(["pending", "confirmed"]).parse(input.stage);
      const change = await tx.execute({
        sql: "UPDATE purchases SET reward_status=? WHERE family=? AND id=? AND status='posted' AND reward_status=? RETURNING reward",
        args: [stage === "pending" ? "confirmed" : "paid", family, p, stage],
      });
      requireThat(
        change.rows.length === 1,
        "Reward has already changed. Refresh the wallet.",
        409,
      );
      if (stage === "pending") return { message: "Cashback confirmed." };
      const goal = await transferGoal(
        tx,
        family,
        p,
        "cashback",
        Number(change.rows[0].reward),
        now,
      );
      await tx.execute({
        sql: "UPDATE purchases SET reward_goal=?,reward_transfer_at=? WHERE family=? AND id=?",
        args: [goal, goal ? now : null, family, p],
      });
      return { message: "Cashback updated." };
    }
    case "budget": {
      owner();
      const month = monthInput.parse(input.month);
      const amount = dollars.parse(input.budget);
      await tx.execute({
        sql: "INSERT INTO periods VALUES(?,?,?,?) ON CONFLICT(family,month) DO UPDATE SET budget=excluded.budget",
        args: [randomUUID(), family, month, amount],
      });
      return { message: "Monthly fuel budget saved." };
    }
    case "car": {
      owner();
      const car = z
        .object({
          name: label,
          fuel: fuelType,
          mpg: z.coerce.number().int().min(1).max(150),
        })
        .parse(input);
      await tx.execute({
        sql: "INSERT INTO cars VALUES(?,?,?,?,?)",
        args: [randomUUID(), family, car.name, car.fuel, car.mpg],
      });
      return { message: "Vehicle added." };
    }
    case "invite": {
      owner();
      const driver = id.parse(input.driver);
      const exists = (
        await tx.execute({
          sql: "SELECT id FROM drivers WHERE family=? AND id=? AND role='driver'",
          args: [family, driver],
        })
      ).rows[0];
      requireThat(exists, "Select a household driver.");
      const token = randomBytes(24).toString("hex");
      await tx.execute({
        sql: "UPDATE invites SET used=1 WHERE family=? AND driver=? AND used=0",
        args: [family, driver],
      });
      await tx.execute({
        sql: "INSERT INTO invites VALUES(?,?,?,?,0)",
        args: [
          token,
          family,
          driver,
          new Date(Date.now() + 86400000).toISOString(),
        ],
      });
      return {
        invitation: "/join/" + token,
        message: "One-time invitation created.",
      };
    }
    default:
      throw new Problem("Unknown action.", 404);
  }
}
