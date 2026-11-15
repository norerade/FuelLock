import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { Transaction } from "@libsql/client";
import type { Identity } from "../session";
import { dollars, label, requireThat } from "./validation";
export async function addGoal(
  tx: Transaction,
  a: Identity,
  input: Record<string, unknown>,
) {
  requireThat(a.role === "owner", "Only the owner can create goals.", 403);
  const goal = z.object({ name: label, target: dollars }).parse(input);
  await tx.execute({
    sql: "INSERT INTO goals(id,family,name,target,auto,cashback) VALUES(?,?,?,?,0,0)",
    args: [randomUUID(), a.family, goal.name, goal.target],
  });
  return { message: "Savings goal created." };
}
export async function updateRules(
  tx: Transaction,
  a: Identity,
  input: Record<string, unknown>,
) {
  requireThat(
    a.role === "owner",
    "Only the owner can change savings rules.",
    403,
  );
  const rules = z
    .object({ roundup: z.string().max(80), cashback: z.string().max(80) })
    .parse(input);
  for (const id of [rules.roundup, rules.cashback].filter(Boolean)) {
    const goal = (
      await tx.execute({
        sql: "SELECT id FROM goals WHERE family=? AND id=?",
        args: [a.family, id],
      })
    ).rows[0];
    requireThat(goal, "Choose a goal in your household.");
  }
  await tx.execute({
    sql: "UPDATE goals SET auto=0,cashback=0 WHERE family=?",
    args: [a.family],
  });
  if (rules.roundup)
    await tx.execute({
      sql: "UPDATE goals SET auto=1 WHERE id=?",
      args: [rules.roundup],
    });
  if (rules.cashback)
    await tx.execute({
      sql: "UPDATE goals SET cashback=1 WHERE id=?",
      args: [rules.cashback],
    });
  return { message: "Savings rules saved." };
}
export async function settings(
  tx: Transaction,
  a: Identity,
  input: Record<string, unknown>,
) {
  requireThat(
    a.role === "owner",
    "Only the owner can change household settings.",
    403,
  );
  const data = z
    .object({ household: label, owner: label, driver: label, budget: dollars })
    .parse(input);
  await tx.execute({
    sql: "UPDATE families SET name=?,budget=? WHERE id=?",
    args: [data.household, data.budget, a.family],
  });
  await tx.execute({
    sql: "UPDATE drivers SET name=CASE WHEN role='owner' THEN ? ELSE ? END WHERE family=?",
    args: [data.owner, data.driver, a.family],
  });
  return { message: "Household settings saved." };
}
