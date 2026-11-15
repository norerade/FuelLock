"use client";
import { useState } from "react";
import { decimal } from "@/server/domain/money";
import { ProtectionScenario } from "./protection-scenario";
import { Field } from "./ui";
export function LandingCalculator() {
  const [cap, setCap] = useState("3.299"),
    [volume, setVolume] = useState("80"),
    [fee, setFee] = useState("4.00");
  let offer;
  try {
    const values = {
      cap: decimal(cap, 6),
      volume: decimal(volume, 3),
      fee: decimal(fee, 2),
      service: 0,
    };
    if (
      values.cap > 0 &&
      values.cap <= 25000000 &&
      values.volume > 0 &&
      values.volume <= 250000 &&
      values.fee <= 1000000
    )
      offer = values;
  } catch {}
  return (
    <section className="panel landing-calculator">
      <h2>Break-even calculator</h2>
      <div className="trip-controls">
        <Field name="Price cap ($/gal)">
          <input
            inputMode="decimal"
            value={cap}
            onChange={(e) => setCap(e.target.value)}
          />
        </Field>
        <Field name="Agreement gallons">
          <input
            inputMode="decimal"
            value={volume}
            onChange={(e) => setVolume(e.target.value)}
          />
        </Field>
        <Field name="Total agreement fees ($)">
          <input
            inputMode="decimal"
            value={fee}
            onChange={(e) => setFee(e.target.value)}
          />
        </Field>
      </div>
      {offer ? (
        <ProtectionScenario offer={offer} />
      ) : (
        <p role="status">
          Enter a cap up to $25, up to 250 gallons and fees from $0 to $10,000.
        </p>
      )}
    </section>
  );
}
