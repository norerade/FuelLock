"use client";
import { useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Coins,
  Fuel,
  ShieldCheck,
  Sparkles,
  SlidersHorizontal,
} from "lucide-react";
import { BalanceCard } from "./balance-card";
import { SpendingChart } from "./spending-chart";
import { report, reportFacts } from "@/server/domain/report";
import { decimal, quote, usd, gallons, perGallon } from "@/server/domain/money";
import { type S, SectionTitle, Field, Fact, Empty } from "./ui";
export function Reports({ s, month }: { s: S; month: string }) {
  const r = report(s, month),
    facts = reportFacts(r);
  const current = s.contracts.filter(
    (c) =>
      c.status === "active" &&
      c.available > 0 &&
      s.offers.find((o) => o.id === c.offer)?.kind === "lock",
  );
  const [id, setId] = useState(current[0]?.id ?? ""),
    [volume, setVolume] = useState("12"),
    [pump, setPump] = useState("4.199");
  const c = current.find((c) => c.id === id) ?? current[0],
    o = s.offers.find((o) => o.id === c?.offer);
  let q;
  try {
    const g = decimal(volume, 3),
      p = decimal(pump, 6);
    if (g > 0 && g <= 250000 && p > 0 && p <= 25000000 && c && o)
      q = quote("lock", g, c.available, p, o.cap);
  } catch {}
  return (
    <div className="report-layout">
      <div className="spotlight-grid report-spotlight">
        <BalanceCard title="Monthly report" label="Net savings" cents={r.net}>
          <div className="balance-kpi">
            <strong>{r.entries.length}</strong>
            <span>Fill-ups</span>
          </div>
          <div className="balance-kpi">
            <strong>
              {gallons(r.volume)} <small>gal</small>
            </strong>
            <span>Purchased</span>
          </div>
        </BalanceCard>
        <SpendingChart s={s} month={month} />
      </div>
      <div className="report-details">
        <section className="panel breakdown">
          <SectionTitle
            title="Savings breakdown"
            sub="How your monthly result adds up."
          />
          <div className="breakdown-lines">
            {[
              {
                label: "Price protection",
                cents: r.benefit,
                icon: ShieldCheck,
                tone: "mint",
              },
              {
                label: "Pre-buy difference",
                cents: r.prebuyEffect,
                icon: Fuel,
                tone: "blue",
              },
              {
                label: "Paid cashback",
                cents: r.paid,
                icon: Coins,
                tone: "sand",
              },
              {
                label: "Receipt reimbursements",
                cents: r.claims,
                icon: ArrowDownLeft,
                tone: "lilac",
              },
              {
                label: "Agreement fees",
                cents: -r.fees,
                icon: ArrowUpRight,
                tone: "neutral",
              },
            ].map((row) => (
              <div className="breakdown-line" key={row.label}>
                <span className={"metric-icon " + row.tone}>
                  <row.icon size={17} />
                </span>
                <span>{row.label}</span>
                <b
                  className={
                    row.cents < 0 ? "negative" : row.cents > 0 ? "credit" : ""
                  }
                >
                  {row.cents > 0 ? "+" : ""}
                  {usd(row.cents || 0)}
                </b>
              </div>
            ))}
          </div>
          <div className="breakdown-total">
            <span>Net result</span>
            <strong className={r.net < 0 ? "negative" : ""}>
              {usd(r.net)}
            </strong>
          </div>
          <details className="report-notes">
            <summary>Calculation details</summary>
            <ul className="report-facts">
              {Object.entries(facts).map(([id, f]) => (
                <li key={id}>{f}</li>
              ))}
            </ul>
          </details>
          {s.aiEnabled && <AiReport key={month} month={month} />}
        </section>
        <section className="panel scenario">
          <SectionTitle
            title="Pump price scenario"
            sub="See what your next fill-up would cost."
          >
            <span className="tile">
              <SlidersHorizontal size={18} />
            </span>
          </SectionTitle>
          {c && o ? (
            <>
              <div className="scenario-fields">
                <Field name="Partner Lock">
                  <select value={c.id} onChange={(e) => setId(e.target.value)}>
                    {current.map((c) => (
                      <option key={c.id} value={c.id}>
                        {s.offers.find((o) => o.id === c.offer)?.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field name="Hypothetical pump price ($/gal)">
                  <input
                    value={pump}
                    inputMode="decimal"
                    onChange={(e) => setPump(e.target.value)}
                  />
                </Field>
                <Field name="Planned gallons">
                  <input
                    value={volume}
                    inputMode="decimal"
                    onChange={(e) => setVolume(e.target.value)}
                  />
                </Field>
              </div>
              {q ? (
                <div className="facts scenario-results">
                  <div className="scenario-comparison">
                    <div>
                      <small>At pump prices</small>
                      <strong>{usd(q.market)}</strong>
                    </div>
                    <span aria-hidden="true">→</span>
                    <div>
                      <small>With this lock</small>
                      <strong>{usd(q.fuel)}</strong>
                    </div>
                  </div>
                  <Fact name="Protected cap">{perGallon(o.cap)}/gal</Fact>
                  <Fact name="Protected / uncovered">
                    {gallons(q.covered)} / {gallons(q.regular)} gal
                  </Fact>

                  <Fact name="Gross protection benefit">{usd(q.benefit)}</Fact>
                  <p className="terms">
                    Fuel due equals covered gallons × the lower price, plus
                    uncovered gallons × pump price. Protection and service fees
                    are posted separately when the agreement activates.
                  </p>
                </div>
              ) : (
                <Empty>
                  Enter up to 250 gallons and a pump price up to $25.
                </Empty>
              )}
            </>
          ) : (
            <Empty>
              No active Partner Lock has gallons available for a scenario.
            </Empty>
          )}
        </section>
      </div>
    </div>
  );
}
function AiReport({ month }: { month: string }) {
  const [lines, setLines] = useState<string[]>([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function generate() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month }),
      });
      const data = await response.json();
      if (!response.ok) throw Error(data.error);
      setLines(data.highlights);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Model unavailable.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="quote-box">
      <button className="secondary" disabled={busy} onClick={generate}>
        <Sparkles size={15} />
        {busy ? "Preparing highlights…" : "Generate AI highlights"}
      </button>
      {error && <p role="alert">{error}</p>}
      {lines.length > 0 && (
        <ul className="report-facts">
          {lines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
