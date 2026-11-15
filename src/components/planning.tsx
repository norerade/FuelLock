"use client";
import { useState } from "react";
import { Coins, MapPin, Navigation, Plus, Route, Target } from "lucide-react";
import {
  decimal,
  decimalText,
  gallons,
  perGallon,
  usd,
} from "@/server/domain/money";
import { defaultTrip, rankStations } from "@/server/domain/trips";
import { routes } from "@/server/providers/routes";
import {
  type S,
  ActionForm,
  Field,
  Modal,
  SectionTitle,
  prettyDate,
  Fact,
  Tag,
} from "./ui";
export function Trips({ s }: { s: S }) {
  const [routeId, setRoute] = useState<string>(defaultTrip.routeId),
    [carId, setCar] = useState(s.cars[0]?.id ?? ""),
    [volume, setVolume] = useState(decimalText(defaultTrip.volume, 3, 0));
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
  const completed = s.transfers.filter((t) => t.status === "completed");
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
            const total = (kind: string) =>
              completed.reduce(
                (sum, t) =>
                  sum + (t.goal === g.id && t.kind === kind ? t.amount : 0),
                0,
              );
            const rounds = total("roundup"),
              rewards = total("cashback");
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
              <Field name="Monthly transfer limit ($)">
                <input
                  name="monthlyLimit"
                  inputMode="decimal"
                  defaultValue={decimalText(s.family.transferLimit, 2)}
                  required
                />
              </Field>
              <Field name="Minimum fuel budget remaining ($)">
                <input
                  name="minimumBalance"
                  inputMode="decimal"
                  defaultValue={decimalText(s.family.minimumBalance, 2)}
                  required
                />
              </Field>
            </div>
            <label className="rule-check">
              <input
                type="checkbox"
                name="paused"
                defaultChecked={!!s.family.transfersPaused}
              />
              Pause automatic transfers
            </label>
            <label className="rule-check">
              <input
                type="checkbox"
                name="consent"
                defaultChecked={!!s.family.transferConsent}
              />
              I authorize simulated transfers under these rules.
            </label>
          </ActionForm>
        ) : (
          <>
            <Fact name="Monthly transfer limit">
              {usd(s.family.transferLimit)}
            </Fact>
            <Fact name="Minimum fuel budget remaining">
              {usd(s.family.minimumBalance)}
            </Fact>
            <Fact name="Automatic transfers">
              {s.family.transfersPaused
                ? "Paused"
                : s.family.transferConsent
                  ? "Authorized"
                  : "Consent required"}
            </Fact>
            <Fact name="Round-ups">
              {s.goals.find((g) => g.auto)?.name ?? "Off"}
            </Fact>
            <Fact name="Cashback">
              {s.goals.find((g) => g.cashback)?.name ?? "Family wallet"}
            </Fact>
          </>
        )}
      </section>
      <section className="panel">
        <SectionTitle title="Transfers">
          <Tag>Simulated</Tag>
        </SectionTitle>
        {s.transfers.length ? (
          <table className="activity-history">
            <thead>
              <tr>
                {["Goal", "Date", "Source", "Amount", "Status"].map((h) => (
                  <th key={h} scope="col">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {s.transfers.map((t) => (
                <tr key={t.purchase + t.kind}>
                  <td>{s.goals.find((g) => g.id === t.goal)?.name}</td>
                  <td data-label="Date">{prettyDate(t.at, true)}</td>
                  <td data-label="Source">
                    {t.kind === "roundup" ? "Round-up" : "Cashback"}
                  </td>
                  <td data-label="Amount">{usd(t.amount)}</td>
                  <td data-label="Status">{t.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>No simulated transfers yet.</p>
        )}
        <Fact name="529">Provider not connected</Fact>
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
                  defaultValue={decimalText(s.family.budget, 2)}
                  required
                  inputMode="decimal"
                />
              </Field>
              <Field name="Next payday">
                <input
                  name="nextPayday"
                  type="date"
                  defaultValue={s.family.nextPayday ?? ""}
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
            {s.family.name} · Default monthly budget {usd(s.family.budget)} ·
            Next payday {s.family.nextPayday ?? "Not set"}
          </p>
        )}
      </section>
      <section className="panel">
        <SectionTitle title="Family pilot plan">
          <Coins size={20} />
        </SectionTitle>
        <p>
          <strong>Family — {usd(699)}/month</strong> (pilot: $0 during demo)
        </p>
        <Fact name="Offer fees">Shown per agreement before activation</Fact>
        <Fact name="Payments">Simulated partner settlement</Fact>
        <Fact name="Units">USD · US gallons · miles</Fact>
      </section>
      <section className="panel">
        <SectionTitle
          title="Unit economics (hypothesis)"
          sub="Per family, per month."
        />
        <Fact name="Service price">{usd(699)}</Fact>
        <Fact name="Target contribution">{usd(400)}</Fact>
        <Fact name="Variable cost limit">{usd(699 - 400)}</Fact>
      </section>
      <section className="panel">
        <SectionTitle title="Integrations" />
        {[
          "Station partners & settlement",
          "Station prices & routes",
          "Receipt protection",
          "Rewards & savings transfers",
        ].map((name) => (
          <Fact key={name} name={name}>
            <Tag>Simulated</Tag>
          </Fact>
        ))}
        {[
          "Bank feed",
          "Live maps",
          "Receipt OCR",
          "Subscription billing",
          "529 provider",
        ].map((name) => (
          <Fact key={name} name={name}>
            <Tag tone="gray">Not connected</Tag>
          </Fact>
        ))}
        <Fact name="AI report provider">
          {s.aiEnabled ? "Configured" : "Not connected"}
        </Fact>
      </section>
    </div>
  );
}
