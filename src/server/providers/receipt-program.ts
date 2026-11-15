import { lineCents } from "../domain/money";
/** Published terms of the simulated pay-first, receipt-based pilot. */
export const receiptProgram = {
  version: "receipt-1.0",
  cap: 3600000,
  maxVolume: 12000,
  maxSpread: 400000,
  days: 30,
  grade: "Regular 87",
  stations: ["Pineway Fuel", "Northline Station"],
};
export function receiptBenefit(
  p: {
    volume: number;
    pump: number;
    fuel: string;
    grade: string;
    status: string;
    contract: string | null;
    at: string;
  },
  station: string,
  hasProof: boolean,
  now: string,
) {
  const age = Date.parse(now) - Date.parse(p.at);
  if (
    !hasProof ||
    p.contract ||
    p.status !== "posted" ||
    p.fuel !== "Gasoline" ||
    p.grade !== receiptProgram.grade ||
    !receiptProgram.stations.includes(station) ||
    age < 0 ||
    age > receiptProgram.days * 86400000
  )
    return 0;
  return lineCents(
    Math.min(p.volume, receiptProgram.maxVolume),
    Math.min(
      receiptProgram.maxSpread,
      Math.max(0, p.pump - receiptProgram.cap),
    ),
  );
}
