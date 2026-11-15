"use client";
import { useState } from "react";
import {
  fullUsePrice,
  familyPlanCents,
  decimal,
  decimalText,
  lineCents,
  gallons,
  perGallon,
  protectionScenario,
  usd,
  type ScenarioMode,
} from "@/server/domain/money";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { FamilyPlanToggle, useFamilyPlan } from "./family-plan";
import { Fact, Field } from "./ui";
export type ScenarioOffer = {
  volume: number;
  cap: number;
  fee: number;
  service: number;
};
function PayoffChart({
  offer,
  current,
  volume,
  fees,
  spread,
}: {
  offer: ScenarioOffer;
  current: number;
  volume: number;
  fees: number;
  spread: number;
}) {
  const threshold = offer.cap + spread;
  const left = Math.max(0, Math.min(offer.cap - 200000, current));
  const right = Math.max(threshold + 200000, current, offer.cap + 500000);
  const data = [...new Set([left, offer.cap, threshold, current, right])]
    .sort((a, b) => a - b)
    .map((price) => ({
      price,
      net: lineCents(volume, Math.max(0, price - offer.cap)) - fees,
    }));
  return (
    <figure className="payoff-chart">
      <figcaption>Net result ($) by market price ($/gal)</figcaption>
      <ResponsiveContainer width="100%" height={190}>
        <LineChart
          data={data}
          margin={{ top: 16, left: 2, right: 14, bottom: 4 }}
        >
          <CartesianGrid strokeDasharray="3 5" vertical={false} />
          <XAxis
            type="number"
            dataKey="price"
            domain={[left, right]}
            allowDecimals={false}
            tickCount={4}
            tickFormatter={perGallon}
            tick={{ fontSize: 12 }}
          />
          <YAxis
            allowDecimals={false}
            tickFormatter={usd}
            width={56}
            tick={{ fontSize: 12 }}
          />
          <Tooltip
            formatter={(v) => [usd(Number(v)), "Net result"]}
            labelFormatter={(v) => perGallon(Number(v)) + "/gal"}
          />
          <ReferenceLine y={0} stroke="#64847d" />
          <Line
            type="linear"
            dataKey="net"
            stroke="#096b6b"
            strokeWidth={3}
            dot={false}
            isAnimationActive={false}
          />
          <ReferenceDot
            x={threshold}
            y={0}
            r={5}
            fill="#ffcf54"
            stroke="#244941"
          />
        </LineChart>
      </ResponsiveContainer>
      <small>
        Gold marker · break-even {fullUsePrice(offer.cap, fees, volume)}/gal
      </small>
    </figure>
  );
}
export function ProtectionScenario({
  offer,
  available,
}: {
  offer: ScenarioOffer;
  available?: number;
}) {
  const [mode, setMode] = useState<ScenarioMode>("agreement");
  const [pump, setPump] = useState(
    decimalText(Math.max(1, offer.cap - 100000), 6, 3),
  );
  const [planned, setPlanned] = useState("12");
  const agreement = mode === "agreement" || available === undefined;
  const includePlan = useFamilyPlan();
  const planCharge = includePlan ? familyPlanCents : 0;
  let scenario;
  let marketPrice = 0;
  try {
    const price = decimal(pump, 6),
      volume = agreement ? offer.volume : decimal(planned, 3);
    if (price > 0 && price <= 25000000 && volume > 0 && volume <= 250000) {
      marketPrice = price;
      scenario = protectionScenario(
        agreement ? "agreement" : "fill",
        offer,
        price,
        volume,
        available ?? 0,
        planCharge,
      );
    }
  } catch {}
  return (
    <div className="stack protection-scenario">
      {available !== undefined && (
        <div className="tabs" role="group" aria-label="Protection calculation">
          <button
            type="button"
            aria-pressed={agreement}
            className={agreement ? "selected" : ""}
            onClick={() => setMode("agreement")}
          >
            Evaluate this agreement
          </button>
          <button
            type="button"
            aria-pressed={!agreement}
            className={!agreement ? "selected" : ""}
            onClick={() => setMode("fill")}
          >
            Next fill-up
          </button>
        </div>
      )}
      <p>
        {agreement
          ? "Use the full " +
            gallons(offer.volume) +
            " gal to evaluate the agreement before purchase."
          : "The agreement fees have already been paid. Only the fuel for this stop is compared."}
      </p>
      <FamilyPlanToggle />
      <div className="form-grid">
        <Field name="Hypothetical pump price ($/gal)">
          <input
            inputMode="decimal"
            value={pump}
            onChange={(e) => setPump(e.target.value)}
          />
        </Field>
        {!agreement && (
          <Field name="Planned gallons">
            <input
              inputMode="decimal"
              value={planned}
              onChange={(e) => setPlanned(e.target.value)}
            />
          </Field>
        )}
      </div>
      {scenario ? (
        <div className="facts scenario-results">
          <Fact name="Cost at pump prices">{usd(scenario.market)}</Fact>
          <Fact name="With this lock at the pump">{usd(scenario.fuel)}</Fact>
          <Fact name="Protected cap">{perGallon(offer.cap)}/gal</Fact>
          <Fact name="Protected / uncovered">
            {gallons(scenario.covered)} / {gallons(scenario.regular)} gal
          </Fact>
          <Fact name="Gross protection benefit">{usd(scenario.benefit)}</Fact>
          <Fact
            name={agreement ? "Agreement fees" : "Additional agreement fees"}
          >
            {usd(agreement ? offer.fee + offer.service : 0)}
          </Fact>
          {includePlan &&
            (agreement ? (
              <Fact name="Family plan · one modeled month">
                {usd(planCharge)}
              </Fact>
            ) : (
              <p>
                The {usd(planCharge)} monthly plan is shown in the monthly
                result; this fill-up has no additional subscription cost.
              </p>
            ))}
          <Fact
            name={agreement ? "Agreement net result" : "Next fill-up savings"}
          >
            <span className={scenario.net < 0 ? "negative" : "credit"}>
              {usd(scenario.net)}
            </span>
          </Fact>
          <p>
            {agreement && scenario.spread !== null
              ? "Break-even at full use: " +
                fullUsePrice(offer.cap, scenario.fees, scenario.covered) +
                "/gal, or " +
                fullUsePrice(0, scenario.fees, scenario.covered) +
                "/gal above the cap."
              : "On covered gallons you benefit when the pump price exceeds the cap."}
          </p>
          {scenario.spread !== null && (
            <PayoffChart
              offer={offer}
              current={marketPrice}
              volume={scenario.covered}
              fees={scenario.fees}
              spread={scenario.spread}
            />
          )}
        </div>
      ) : (
        <p role="status">
          Enter a valid pump price up to $25 and a volume up to 250 gallons.
        </p>
      )}
    </div>
  );
}
