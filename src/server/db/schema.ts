import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
const id = () => text("id").primaryKey();
const household = () => text("family").notNull();
const n = (key: string) => integer(key).notNull();
const s = (key: string) => text(key).notNull();
export const families = sqliteTable("families", {
  id: id(),
  name: s("name"),
  budget: n("budget"),
  plan: s("plan"),
  demo: n("demo"),
  created: s("created"),
});
export const drivers = sqliteTable("drivers", {
  id: id(),
  family: household(),
  name: s("name"),
  role: s("role"),
});
export const cars = sqliteTable("cars", {
  id: id(),
  family: household(),
  name: s("name"),
  fuel: s("fuel"),
  mpg: n("mpg"),
});
export const stations = sqliteTable("stations", {
  id: id(),
  family: household(),
  name: s("name"),
  address: s("address"),
  gasoline: n("gasoline"),
  diesel: n("diesel"),
  mile: n("mile"),
});
export const offers = sqliteTable("offers", {
  id: id(),
  family: household(),
  name: s("name"),
  partner: s("partner"),
  kind: text("kind", { enum: ["lock", "prebuy"] }).notNull(),
  fuel: s("fuel"),
  grade: s("grade"),
  cap: n("cap"),
  volume: n("volume"),
  fee: n("fee"),
  service: n("service"),
  deadline: s("deadline"),
  starts: s("starts"),
  ends: s("ends"),
  allowed: s("allowed"),
  scope: s("scope"),
  terms: s("terms"),
  version: s("version"),
  source: s("source"),
  status: s("status"),
});
export const contracts = sqliteTable("contracts", {
  id: id(),
  family: household(),
  offer: s("offer"),
  code: s("code"),
  status: s("status"),
  available: n("available"),
  reserved: n("reserved"),
  used: n("used"),
  activated: text("activated"),
});
export const purchases = sqliteTable("purchases", {
  id: id(),
  family: household(),
  driver: s("driver"),
  station: s("station"),
  contract: text("contract"),
  fuel: s("fuel"),
  grade: s("grade"),
  volume: n("volume"),
  covered: n("covered"),
  pump: n("pump"),
  amount: n("amount"),
  benefit: n("benefit"),
  market: n("market"),
  reward: n("reward"),
  rewardStatus: s("reward_status"),
  status: s("status"),
  at: s("at"),
  source: s("source"),
  fingerprint: s("fingerprint"),
  roundUp: n("round_up"),
  goal: text("goal"),
  rewardGoal: text("reward_goal"),
});
export const receipts = sqliteTable("receipts", {
  id: id(),
  family: household(),
  purchase: s("purchase"),
  hash: s("hash"),
  name: s("name"),
  mime: s("mime"),
});
export const goals = sqliteTable("goals", {
  id: id(),
  family: household(),
  name: s("name"),
  target: n("target"),
  auto: n("auto"),
  cashback: n("cashback"),
});
export const invites = sqliteTable("invites", {
  id: id(),
  family: household(),
  driver: s("driver"),
  expires: s("expires"),
  used: n("used"),
});
export const periods = sqliteTable("periods", {
  id: id(),
  family: household(),
  month: s("month"),
  budget: n("budget"),
});
export const claims = sqliteTable("claims", {
  id: id(),
  family: household(),
  purchase: s("purchase"),
  amount: n("amount"),
  status: s("status"),
  at: s("at"),
  version: s("version"),
  decided: text("decided"),
  paid: text("paid"),
});
