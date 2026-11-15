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
export const usd = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    cents / 100,
  );
export const gallons = (volume: number) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: 3 }).format(
    volume / 1000,
  );
export const perGallon = (price: number) =>
  "$" +
  new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  }).format(price / 1_000_000);
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
export function cashback(cents: number) {
  return halfUp(BigInt(cents) * 2n, 100n);
}
