import type { Snapshot } from "../snapshot";
import { halfUp, quote } from "./money";
import { routes } from "../providers/routes";
export const defaultTrip = { routeId: routes[0].id, volume: 12000 };
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
          ...quote("lock", volume, 0, pump, pump),
        },
      ];
      for (const { contract: c, offer: o } of contracts) {
        if (!o.allowed.includes(station.id)) continue;
        options.push({
          name: o.name,
          lock: o.kind === "lock",
          ...quote(o.kind, volume, c.available, pump, o.cap),
        });
      }
      const best = options.sort((a, b) => a.fuel - b.fuel)[0];
      const detourCost = halfUp(
        BigInt(detour) * BigInt(pump),
        BigInt(car.mpg) * 100000n,
      );
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
          total: best.fuel + detourCost,
        },
      ];
    })
    .sort((a, b) => a.total - b.total || a.detour - b.detour);
}
