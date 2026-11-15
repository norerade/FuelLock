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
import { gallons, usd } from "@/server/domain/money";
import { FamilyPlanToggle, useFamilyPlan } from "./family-plan";
import { ProtectionScenario } from "./protection-scenario";
import { type S, SectionTitle, Field, Empty } from "./ui";
export function Reports({ s, month }: { s: S; month: string }) {
  const includePlan = useFamilyPlan();
  const r = report(s, month, includePlan),
    facts = reportFacts(r);
  const locks = s.offers.filter(
    (o) =>
      o.kind === "lock" &&
      (o.status === "published" ||
        s.contracts.some((c) => c.offer === o.id && c.status === "active")),
  );
  const [id, setId] = useState(locks[0]?.id ?? "");
  const selected = locks.find((o) => o.id === id) ?? locks[0];
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
          <FamilyPlanToggle />
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
              ...(r.planFee
                ? [
                    {
                      label: "Family plan · modeled",
                      cents: -r.planFee,
                      icon: Coins,
                      tone: "neutral",
                    },
                  ]
                : []),
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
          {s.aiEnabled && !includePlan && (
            <AiReport key={month} month={month} />
          )}
        </section>
        <section className="panel scenario">
          <SectionTitle
            title="Pump price scenario"
            sub="Compare buying protection with using a lock you already hold."
          >
            <span className="tile">
              <SlidersHorizontal size={18} />
            </span>
          </SectionTitle>
          {locks.length > 0 ? (
            <>
              <Field name="Partner Lock">
                <select
                  value={selected.id}
                  onChange={(e) => setId(e.target.value)}
                >
                  {locks.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
              </Field>
              <ProtectionScenario
                key={selected.id}
                offer={selected}
                available={
                  s.contracts.find(
                    (c) => c.offer === selected.id && c.status === "active",
                  )?.available
                }
              />
            </>
          ) : (
            <Empty>No Partner Lock available for evaluation.</Empty>
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
