"use client";
import { useState } from "react";
import { Coins, MapPin, Navigation, Plus, Route, Target } from "lucide-react";
import { decimal, gallons, perGallon, usd } from "@/server/domain/money";
import { rankStations } from "@/server/domain/trips";
import { routes } from "@/server/providers/routes";
import {
  type S,
  ActionForm,
  Field,
  Modal,
  SectionTitle,
  Fact,
  Tag,
} from "./ui";
export function Trips({ s }: { s: S }) {
  const [routeId, setRoute] = useState<string>(routes[0].id),
    [carId, setCar] = useState(s.cars[0]?.id ?? ""),
    [volume, setVolume] = useState("12");
  let qty = 0;
  try {
    qty = decimal(volume, 3);
  } catch {}
  const rows = rankStations(s, routeId, carId, qty),
    route = routes.find((r) => r.id === routeId)!;
  return (
    <div className="stack">
      <section className="panel">
        <SectionTitle
          title="Plan a fuel stop"
          sub="Compare simulated station prices and the cost of driving off your route."
        />
        <div className="trip-controls">
          <Field name="Route">
            <select value={routeId} onChange={(e) => setRoute(e.target.value)}>
              {routes.map((r) => (
                <option value={r.id} key={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </Field>
          <Field name="Vehicle">
            <select value={carId} onChange={(e) => setCar(e.target.value)}>
              {s.cars.map((c) => (
                <option value={c.id} key={c.id}>
                  {c.name} · {c.mpg} MPG
                </option>
              ))}
            </select>
          </Field>
          <Field name="Planned gallons">
            <input
              value={volume}
              onChange={(e) => setVolume(e.target.value)}
              inputMode="decimal"
            />
          </Field>
        </div>
        <div className="route-line">
          <Route size={18} />
          <strong>{route.from}</strong>
          <span>→</span>
          <strong>{route.to}</strong>
          <small>{route.miles} mi</small>
        </div>
      </section>
      <section className="panel">
        <SectionTitle
          title="Stations on your route"
          sub="Ranked by estimated fuel due now plus the fuel cost of the round-trip detour."
        />
        {!rows.length && (
          <p role="status">Enter a volume from 0.001 to 250 gallons.</p>
        )}
        <div className="station-options">
          {rows.map((r, i) => (
            <article
              key={r.station.id}
              className={"station-card " + (i === 0 ? "best-stop" : "")}
            >
              <div className="row">
                <span className={"tile " + (i ? "blue" : "")}>
                  <MapPin size={21} />
                </span>
                {!i && <Tag>Lowest estimated cost</Tag>}
              </div>
              <h3>{r.station.name}</h3>
              <p>
                {r.station.address} · {perGallon(r.pump)}/gal
              </p>
              <div className="trip-facts">
                <div>
                  <small>Payment at pump</small>
                  <b>{usd(r.fuel)}</b>
                </div>
                <div>
                  <small>Detour · {r.detour / 10} mi</small>
                  <b>{usd(r.detourCost)}</b>
                </div>
                <div>
                  <small>Estimated total</small>
                  <b>{usd(r.total)}</b>
                </div>
              </div>
              <div className="route-note">
                <Navigation size={13} />
                {r.option}
                {r.covered > 0
                  ? " · " + gallons(r.covered) + " gal covered"
                  : ""}
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
export function Goals({ s }: { s: S }) {
  const posted = s.purchases.filter((p) => p.status === "posted");
  const owner = s.actor.role === "owner";
  return (
    <div className="stack">
      <section className="panel">
        <SectionTitle title="Your savings goals">
          {owner && (
            <Modal
              title="New savings goal"
              trigger={
                <button className="secondary small">
                  <Plus size={15} />
                  New goal
                </button>
              }
            >
              <ActionForm action="goal" submit="Create goal">
                <Field name="Goal name">
                  <input name="name" maxLength={60} required />
                </Field>
                <Field name="Target ($)">
                  <input name="target" inputMode="decimal" required />
                </Field>
              </ActionForm>
            </Modal>
          )}
        </SectionTitle>
        <div className="card-grid">
          {s.goals.map((g) => {
            const rounds = posted.reduce(
              (n, p) => n + (p.goal === g.id ? p.roundUp : 0),
              0,
            );
            const rewards = posted.reduce(
              (n, p) =>
                n +
                (p.rewardGoal === g.id && p.rewardStatus === "paid"
                  ? p.reward
                  : 0),
              0,
            );
            const saved = rounds + rewards;
            return (
              <article className="goal-card" key={g.id}>
                <span className="tile">
                  <Target />
                </span>
                <h3>{g.name}</h3>
                <div className="big-number">
                  {usd(saved)} <small>of {usd(g.target)}</small>
                </div>
                <progress
                  aria-label={"Savings progress for " + g.name}
                  value={Math.min(saved, g.target)}
                  max={g.target}
                />
                <p>
                  {usd(rounds)} from round-ups · {usd(rewards)} from cashback
                </p>
              </article>
            );
          })}
        </div>
      </section>
      <section className="panel">
        <SectionTitle
          title="Automatic savings rules"
          sub="Round up each posted pump payment to the next dollar and choose where newly paid rewards go."
        />
        {owner ? (
          <ActionForm action="rules" submit="Save rules">
            <div className="form-grid">
              {[
                {
                  key: "roundup",
                  title: "Send round-ups to",
                  value: s.goals.find((g) => g.auto)?.id,
                },
                {
                  key: "cashback",
                  title: "Send paid cashback to",
                  value: s.goals.find((g) => g.cashback)?.id,
                },
              ].map((rule) => (
                <Field key={rule.key} name={rule.title}>
                  <select name={rule.key} defaultValue={rule.value || ""}>
                    <option value="">
                      {rule.key === "roundup" ? "Off" : "Family wallet"}
                    </option>
                    {s.goals.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </Field>
              ))}
            </div>
          </ActionForm>
        ) : (
          <>
            <Fact name="Round-ups">
              {s.goals.find((g) => g.auto)?.name ?? "Off"}
            </Fact>
            <Fact name="Cashback">
              {s.goals.find((g) => g.cashback)?.name ?? "Family wallet"}
            </Fact>
          </>
        )}
      </section>
    </div>
  );
}
export function Settings({ s }: { s: S }) {
  return (
    <div className="stack">
      <section className="panel">
        <SectionTitle title="Household preferences" />
        {s.actor.role === "owner" ? (
          <ActionForm action="settings">
            <div className="form-grid">
              <Field name="Household name">
                <input name="household" defaultValue={s.family.name} required />
              </Field>
              <Field name="Default monthly budget ($)">
                <input
                  name="budget"
                  defaultValue={(s.family.budget / 100).toFixed(2)}
                  required
                  inputMode="decimal"
                />
              </Field>
              <Field name="Owner name">
                <input
                  name="owner"
                  defaultValue={s.drivers.find((d) => d.role === "owner")?.name}
                  required
                />
              </Field>
              <Field name="Second driver name">
                <input
                  name="driver"
                  defaultValue={
                    s.drivers.find((d) => d.role === "driver")?.name
                  }
                  required
                />
              </Field>
            </div>
            <p>Months with a saved budget keep their own limit.</p>
          </ActionForm>
        ) : (
          <p>
            {s.family.name} · Default monthly budget {usd(s.family.budget)}
          </p>
        )}
      </section>
      <section className="panel">
        <SectionTitle title="Family pilot plan">
          <Coins size={20} />
        </SectionTitle>
        <Fact name="Subscription">{usd(0)} / month</Fact>
        <Fact name="Offer fees">Shown per agreement before activation</Fact>
        <Fact name="Payments">Simulated partner settlement</Fact>
        <Fact name="Units">USD · US gallons · miles</Fact>
      </section>
    </div>
  );
}
