/** Quantities are milligallons, prices microdollars/gal, and posted amounts cents. */
export function decimal(value: string, precision: number): number {
  const match = /^(\d{1,9})(?:\.(\d+))?$/.exec(value.trim());
  if (!match || (match[2]?.length ?? 0) > precision)
    throw new Error(
      "Enter a valid amount with up to " + precision + " decimal places.",
    );
  const result = Number(
    BigInt(match[1]) * 10n ** BigInt(precision) +
      BigInt((match[2] ?? "").padEnd(precision, "0") || "0"),
  );
  if (!Number.isSafeInteger(result)) throw new Error("Amount is too large.");
  return result;
}
export function halfUp(n: bigint, d: bigint): number {
  if (d <= 0n) throw new Error("Invalid denominator.");
  const value = Number(n < 0n ? -((-n + d / 2n) / d) : (n + d / 2n) / d);
  if (!Number.isSafeInteger(value)) throw new Error("Amount is too large.");
  return value;
}
export const lineCents = (volume: number, price: number) =>
  halfUp(BigInt(volume) * BigInt(price), 10_000_000n);
export function decimalText(value: number, places: number, minimum = places) {
  const digits = BigInt(Math.abs(value))
    .toString()
    .padStart(places + 1, "0");
  const fraction = digits
    .slice(-places)
    .replace(/0+$/, "")
    .padEnd(minimum, "0");
  return (
    (value < 0 ? "-" : "") +
    digits.slice(0, -places) +
    (fraction ? "." + fraction : "")
  );
}
function formatted(
  value: number,
  places: number,
  minimum: number,
  prefix = "",
) {
  const [whole, fraction] = decimalText(Math.abs(value), places, minimum).split(
    ".",
  );
  return (
    (value < 0 ? "-" : "") +
    prefix +
    BigInt(whole).toLocaleString("en-US") +
    (fraction ? "." + fraction : "")
  );
}
export const usd = (cents: number) => formatted(cents, 2, 2, "$");
export const gallons = (volume: number) => formatted(volume, 3, 0);
/** Format a microdollar rate (or an exact weighted rate) directly in thousandths. */
export function priceRatio(numerator: bigint, denominator: bigint) {
  return formatted(halfUp(numerator, denominator * 1000n), 3, 3, "$");
}
export const perGallon = (price: number) => priceRatio(BigInt(price), 1n);
export function fullUsePrice(cap: number, fees: number, volume: number) {
  return priceRatio(
    BigInt(cap) * BigInt(volume) + BigInt(fees) * 10_000_000n,
    BigInt(volume),
  );
}
export type OfferKind = "lock" | "prebuy";
export function quote(
  kind: OfferKind,
  volume: number,
  available: number,
  pump: number,
  strike: number,
) {
  const covered = Math.min(volume, available);
  const regular = volume - covered;
  const effective = kind === "prebuy" ? 0 : Math.min(pump, strike);
  const raw =
    BigInt(covered) * BigInt(effective) + BigInt(regular) * BigInt(pump);
  const benefit =
    kind === "lock" ? lineCents(covered, Math.max(0, pump - strike)) : 0;
  return {
    covered,
    regular,
    fuel: halfUp(raw, 10_000_000n),
    benefit,
    market: lineCents(volume, pump),
  };
}
// Price spread in microdollars per gallon for fees in cents and volume in milligallons.
export const breakEvenSpread = (fees: number, covered: number) =>
  covered > 0 ? halfUp(BigInt(fees) * 10_000_000n, BigInt(covered)) : null;

export function lockScenario(
  volume: number,
  available: number,
  pump: number,
  cap: number,
  fees: number,
) {
  const result = quote("lock", volume, available, pump, cap);
  return {
    ...result,
    fees,
    net: result.benefit - fees,
    spread: breakEvenSpread(fees, result.covered),
  };
}

export type ScenarioMode = "agreement" | "fill";
export function protectionScenario(
  mode: ScenarioMode,
  offer: { volume: number; cap: number; fee: number; service: number },
  pump: number,
  planned: number,
  available: number,
  planFee = 0,
) {
  const agreement = mode === "agreement";
  return lockScenario(
    agreement ? offer.volume : planned,
    agreement ? offer.volume : available,
    pump,
    offer.cap,
    agreement ? offer.fee + offer.service + planFee : 0,
  );
}
export const familyPlanCents = 699;
export function cashback(cents: number) {
  return halfUp(BigInt(cents) * 2n, 100n);
}
