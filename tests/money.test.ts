import { describe, expect, it } from "vitest";
import {
  decimal,
  halfUp,
  lineCents,
  lockScenario,
  quote,
  usd,
  perGallon,
  protectionScenario,
  fullUsePrice,
} from "../src/server/domain/money";
describe("integer money", () => {
  it("parses fractional pump prices and gallons exactly", () => {
    expect(decimal("3.299001", 6)).toBe(3299001);
    expect(decimal("10.015", 3)).toBe(10015);
    expect(() => decimal("1.0001", 3)).toThrow();
    expect(() => decimal("1e5", 2)).toThrow();
  });
  it("rounds the combined fuel line once, half up", () => {
    expect(lineCents(1000, 1005000)).toBe(101);
    expect(halfUp(-5n, 10n)).toBe(-1);
    expect(quote("lock", 2, 1, 4000000, 3000000).fuel).toBe(1);
  });
  it("keeps the pump price beneath the cap and splits partial coverage", () => {
    expect(quote("lock", 12000, 5000, 4000000, 3000000)).toMatchObject({
      covered: 5000,
      regular: 7000,
      fuel: 4300,
      benefit: 500,
    });
    expect(quote("lock", 1000, 1000, 2800000, 3000000).fuel).toBe(280);
  });
  it("shows the full fee loss below the cap", () => {
    expect(lockScenario(12000, 8000, 2800000, 3000000, 400)).toMatchObject({
      fuel: 3360,
      benefit: 0,
      net: -400,
      spread: 500000,
    });
  });
  it("recovers fees above break-even only on covered gallons", () => {
    expect(lockScenario(12000, 8000, 4000000, 3000000, 400)).toMatchObject({
      fuel: 4000,
      benefit: 800,
      net: 400,
      spread: 500000,
    });
    expect(lockScenario(12000, 8000, 3500000, 3000000, 400).net).toBe(0);
    expect(lockScenario(12000, 0, 4000000, 3000000, 400).spread).toBeNull();
  });
  it("separates the agreement break-even from the marginal cost of an active lock", () => {
    const offer = { cap: 3299000, volume: 80000, fee: 350, service: 50 };
    const calc = (mode: "agreement" | "fill", pump: number, plan = 0) =>
      protectionScenario(mode, offer, pump, 12000, 10000, plan);
    expect(calc("agreement", 3199000).net).toBe(-400);
    expect(calc("agreement", 3349000).net).toBe(0);
    expect(calc("agreement", 3399000).net).toBe(400);
    expect(calc("agreement", 3399000, 699).net).toBe(-299);
    expect(calc("fill", 3199000, 699)).toMatchObject({
      net: 0,
      fees: 0,
      covered: 10000,
      regular: 2000,
    });
    expect(calc("fill", 3399000, 699).net).toBe(100);
    expect(fullUsePrice(3399000, 175, 40000)).toBe("$3.443");
    expect(fullUsePrice(0, 1, 20001)).toBe("$0.000");
    expect(perGallon(3000000)).toBe("$3.000");
  });
  it("charges only uncovered prepaid volume at the pump", () => {
    expect(quote("prebuy", 8500, 8000, 4000000, 3200000).fuel).toBe(200);
  });
  it("preserves negative results and sub-cent prices", () => {
    expect(usd(-125)).toBe("-$1.25");
    expect(perGallon(3299000)).toBe("$3.299");
  });
});
