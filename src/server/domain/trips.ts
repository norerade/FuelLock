import type { Snapshot } from "../snapshot";
import { halfUp, quote, cashback, decimalText, usd, perGallon } from "./money";
import { routes } from "../providers/routes";
export const defaultTrip = { routeId: routes[0].id, volume: 12000 };
/** Each scheduled trip is a round trip; payday itself is outside the forecast. */
export function paydayEstimate(
  now: string,
  payday: string | null,
  zone: string,
  mpg: number,
) {
  if (!payday || mpg <= 0) return null;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(now));
  const part = (key: string) => parts.find((p) => p.type === key)!.value;
  const start = Date.UTC(
    Number(part("year")),
    Number(part("month")) - 1,
    Number(part("day")),
  );
  const days = (Date.parse(payday) - start) / 86400000;
  if (days < 0) return { days, volume: 0 };
  const weekday = new Date(start).getUTCDay();
  let miles = 0;
  for (let d = 0; d < 7; d++) {
    const count = Math.floor(days / 7) + (d < days % 7 ? 1 : 0);
    for (const route of routes)
      if ((route.daysOfWeek as readonly number[]).includes((weekday + d) % 7))
        miles += count * route.miles * 2;
  }
  return { days, volume: halfUp(BigInt(miles) * 10n, BigInt(mpg)) * 100 };
}
export function stationReason(stops: ReturnType<typeof rankStations>) {
  const [first, second] = stops;
  if (!first) return "";
  if (!second)
    return first.station.name + " is the only eligible stop on this route.";
  const difference = second.total - first.total;
  const sameCap =
    first.covered > 0 &&
    first.covered === second.covered &&
    first.coveredRate === second.coveredRate &&
    first.fuel === second.fuel &&
    first.pump !== second.pump &&
    first.coveredRate > 0;
  const reason = sameCap
    ? "Protection brings both stations to " +
      perGallon(first.coveredRate) +
      "/gal on covered fuel. "
    : "";
  if (!difference)
    return (
      reason +
      first.station.name +
      " and " +
      second.station.name +
      " have the same estimated net cost." +
      (first.detour < second.detour
        ? " " + first.station.name + " has the shorter detour."
        : "")
    );
  const advantage =
    first.detour < second.detour
      ? " The detour is " +
        decimalText(second.detour - first.detour, 1, 0) +
        " mi shorter."
      : first.fuel < second.fuel
        ? " Its pump payment is " + usd(second.fuel - first.fuel) + " lower."
        : "";
  return (
    reason +
    first.station.name +
    " costs " +
    usd(difference) +
    " less than " +
    second.station.name +
    " after detour fuel and estimated cashback." +
    advantage
  );
}
export function rankStations(
  s: Snapshot,
  routeId: string,
  carId: string,
  volume: number,
) {
  const route = routes.find((r) => r.id === routeId);
  const car = s.cars.find((c) => c.id === carId);
  if (
    !route ||
    !car ||
    !Number.isSafeInteger(volume) ||
    volume <= 0 ||
    volume > 250000
  )
    return [];
  const contracts = s.contracts.flatMap((contract) => {
    const offer = s.offers.find((o) => o.id === contract.offer);
    if (
      !offer ||
      contract.status !== "active" ||
      !contract.available ||
      offer.starts > s.now ||
      offer.ends < s.now ||
      offer.fuel !== car.fuel ||
      (offer.scope === "owner" && s.actor.role !== "owner")
    )
      return [];
    return [{ contract, offer }];
  });
  const protectedBefore = contracts.reduce(
    (sum, { contract, offer }) =>
      sum + (offer.kind === "lock" ? contract.available : 0),
    0,
  );
  return s.stations
    .flatMap((station) => {
      const detour = (route.detours as Record<string, number>)[
        String(station.mile)
      ];
      if (detour === undefined) return [];
      const pump = car.fuel === "Diesel" ? station.diesel : station.gasoline;
      const options = [
        {
          name: "Pump price",
          lock: false,
          rate: pump,
          ...quote("lock", volume, 0, pump, pump),
        },
      ];
      for (const { contract: c, offer: o } of contracts) {
        if (!o.allowed.includes(station.id)) continue;
        options.push({
          name: o.name,
          lock: o.kind === "lock",
          rate: o.kind === "prebuy" ? 0 : Math.min(o.cap, pump),
          ...quote(o.kind, volume, c.available, pump, o.cap),
        });
      }
      const best = options.sort((a, b) => a.fuel - b.fuel)[0];
      const detourCost = halfUp(
        BigInt(detour) * BigInt(pump),
        BigInt(car.mpg) * 100000n,
      );
      const reward = cashback(best.fuel);
      return [
        {
          station,
          pump,
          detour,
          detourCost,
          option: best.name,
          covered: best.covered,
          protectedAfter: protectedBefore - (best.lock ? best.covered : 0),
          fuel: best.fuel,
          coveredRate: best.rate,
          detourVolume: halfUp(BigInt(detour) * 100n, BigInt(car.mpg)),
          minutes: halfUp(BigInt(detour) * 60n, 300n),
          cashback: reward,
          outlay: best.fuel + detourCost,
          total: best.fuel + detourCost - reward,
        },
      ];
    })
    .sort((a, b) => a.total - b.total || a.detour - b.detour);
}
