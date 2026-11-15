import type { Snapshot } from "../snapshot";
import { lineCents, usd, gallons, familyPlanCents } from "./money";
export function reportFacts(r: ReturnType<typeof report>) {
  return {
    spending:
      "Your household recorded " +
      r.entries.length +
      " fill-ups totaling " +
      gallons(r.volume) +
      " gallons. Fuel paid at the pump was " +
      usd(r.fuel) +
      ".",
    budget:
      "Budget remaining is " +
      usd(r.remaining) +
      " after " +
      usd(r.total) +
      " in fuel, prepayments and agreement fees.",
    protection:
      "Partner Lock reduced eligible fuel costs by " +
      usd(r.benefit) +
      ". Pre-buy price differences contributed " +
      usd(r.prebuyEffect) +
      ".",
    rewards:
      "Paid cashback was " +
      usd(r.paid) +
      " and paid receipt reimbursements were " +
      usd(r.claims) +
      ".",
    net:
      "Net result was " +
      usd(r.net) +
      " after " +
      usd(r.protectionFees) +
      " in protection fees and " +
      usd(r.serviceFees) +
      " in service fees" +
      (r.planFee
        ? " and " + usd(r.planFee) + " for one modeled month of Family"
        : "") +
      ".",
  };
}
export function report(s: Snapshot, month: string, includePlan = false) {
  const entries = s.purchases.filter(
    (p) => p.at.startsWith(month) && p.status === "posted",
  );
  const sum = (f: (p: Snapshot["purchases"][number]) => number) =>
    entries.reduce((a, p) => a + f(p), 0);
  const activated = s.contracts
    .filter((c) => c.activated?.startsWith(month))
    .map((c) => s.offers.find((o) => o.id === c.offer)!);
  const protectionFees = activated.reduce((n, o) => n + o.fee, 0);
  const serviceFees = activated.reduce((n, o) => n + o.service, 0);
  const fees = protectionFees + serviceFees;
  const upfront = activated.reduce(
    (n, o) => n + (o.kind === "prebuy" ? lineCents(o.volume, o.cap) : 0),
    0,
  );
  const paid = sum((p) => (p.rewardStatus === "paid" ? p.reward : 0));
  const benefit = sum((p) => p.benefit);
  const prebuyEffect = sum((p) => {
    const c = s.contracts.find((c) => c.id === p.contract);
    const o = s.offers.find((o) => o.id === c?.offer);
    return o?.kind === "prebuy" ? lineCents(p.covered, p.pump - o.cap) : 0;
  });
  const claims = s.claims
    .filter(
      (c) => c.status === "paid" && entries.some((p) => p.id === c.purchase),
    )
    .reduce((n, c) => n + c.amount, 0);
  const fuel = sum((p) => p.amount);
  const total = fuel + fees + upfront;
  const budget =
    s.periods.find((p) => p.month === month)?.budget ?? s.family.budget;
  const market = sum((p) => p.market);
  const prepaidUsed = sum((p) => {
    const c = s.contracts.find((c) => c.id === p.contract);
    const offer = s.offers.find((o) => o.id === c?.offer);
    return offer?.kind === "prebuy" ? lineCents(p.covered, offer.cap) : 0;
  });
  const planFee = includePlan ? familyPlanCents : 0;
  const withFuelLock = fuel + prepaidUsed + fees + planFee;
  const net = benefit + prebuyEffect + paid + claims - fees - planFee;
  const rounding = net - (market - withFuelLock + paid + claims);
  return {
    market,
    prepaidUsed,
    withFuelLock,
    rounding,
    planFee,
    entries,
    fuel,
    benefit,
    prebuyEffect,
    fees,
    protectionFees,
    serviceFees,
    upfront,
    total,
    budget,
    remaining: budget - total,
    paid,
    claims,
    net,
    volume: sum((p) => p.volume),
    roundups: sum((p) => p.roundUp),
  };
}
