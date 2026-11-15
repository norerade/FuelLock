import { gallons, perGallon, usd, decimalText } from "@/server/domain/money";
import type { rankStations } from "@/server/domain/trips";
import { Fact } from "./ui";
export function StationCost({
  stop,
}: {
  stop: ReturnType<typeof rankStations>[number];
}) {
  return (
    <details className="station-cost">
      <summary>How this stop is priced</summary>
      <Fact name="Posted pump price">{perGallon(stop.pump)}/gal</Fact>
      <Fact name={stop.covered ? "Covered price at pump" : "Unprotected price"}>
        {perGallon(stop.coveredRate)}/gal
      </Fact>
      <Fact name="Covered gallons">
        {gallons(stop.covered)} gal · {stop.option}
      </Fact>
      <Fact name="Protected gallons after this stop">
        {gallons(stop.protectedAfter)} gal
      </Fact>
      <Fact name="At the pump">{usd(stop.fuel)}</Fact>
      <Fact name="Round-trip detour">
        {decimalText(stop.detour, 1, 0)} mi · ≈{stop.minutes} min ·{" "}
        {gallons(stop.detourVolume)} gal
      </Fact>
      <Fact name="Detour fuel cost">{usd(stop.detourCost)}</Fact>
      <Fact name="Estimated outlay">{usd(stop.outlay)}</Fact>
      <Fact name="Estimated cashback after payout">{usd(stop.cashback)}</Fact>
      <Fact name="Estimated net cost">{usd(stop.total)}</Fact>
      <small>
        Detour time assumes 30 mph. Cashback is estimated on the pump payment
        and paid separately.
      </small>
    </details>
  );
}
