"use client";
import dynamic from "next/dynamic";
import { useState } from "react";
import { useCalculatorInput } from "./use-calculator-input";
import {
  fullUsePrice,
  familyPlanCents,
  decimal,
  decimalText,
  gallons,
  perGallon,
  protectionScenario,
  usd,
  type ScenarioMode,
} from "@/server/domain/money";
import { FamilyPlanToggle, useFamilyPlan } from "./family-plan";
import { Fact, Field } from "./ui";
export type ScenarioOffer = {
  volume: number;
  cap: number;
  fee: number;
  service: number;
};
const PayoffChart = dynamic(() => import("./payoff-chart"), {
  ssr: false,
  loading: () => <div style={{ height: 190 }} aria-hidden="true" />,
});

export function ProtectionScenario({
  offer,
  available,
}: {
  offer: ScenarioOffer;
  available?: number;
}) {
  const [mode, setMode] = useState<ScenarioMode>("agreement");
  const [pump, pumpField] = useCalculatorInput(
    decimalText(Math.max(1, offer.cap - 100000), 6, 3),
  );
  const [planned, plannedField] = useCalculatorInput("12");
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
          <input {...pumpField} />
        </Field>
        {!agreement && (
          <Field name="Planned gallons">
            <input {...plannedField} />
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
            <figure className="payoff-chart">
              <figcaption>Net result ($) by market price ($/gal)</figcaption>
              <PayoffChart
                cap={offer.cap}
                current={marketPrice}
                volume={scenario.covered}
                fees={scenario.fees}
                spread={scenario.spread}
              />
              <small>
                Gold marker · break-even{" "}
                {fullUsePrice(offer.cap, scenario.fees, scenario.covered)}/gal
              </small>
            </figure>
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
