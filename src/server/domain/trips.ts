import type { Snapshot } from "../snapshot";
import { halfUp, quote } from "./money";
import { routes } from "../providers/routes";
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
  return s.stations
    .flatMap((station) => {
      const detour = (route.detours as Record<string, number>)[
        String(station.mile)
      ];
      if (detour === undefined) return [];
      const pump = car.fuel === "Diesel" ? station.diesel : station.gasoline;
      const options = [
        { name: "Pump price", ...quote("lock", volume, 0, pump, pump) },
      ];
      for (const c of s.contracts) {
        const o = s.offers.find((o) => o.id === c.offer);
        if (
          !o ||
          c.status !== "active" ||
          !c.available ||
          o.starts > s.now ||
          o.ends < s.now ||
          o.fuel !== car.fuel ||
          !o.allowed.includes(station.id) ||
          (o.scope === "owner" && s.actor.role !== "owner")
        )
          continue;
        options.push({
          name: o.name,
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
          fuel: best.fuel,
          total: best.fuel + detourCost,
        },
      ];
    })
    .sort((a, b) => a.total - b.total || a.detour - b.detour);
}
