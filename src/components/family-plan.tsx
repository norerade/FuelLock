"use client";
import { useSyncExternalStore } from "react";
import { familyPlanCents, usd } from "@/server/domain/money";
const key = "fuellock-include-family-plan";
function saveFamilyPlan(enabled: boolean) {
  window.sessionStorage.setItem(key, enabled ? "yes" : "no");
  window.dispatchEvent(new Event("fuellock-plan-change"));
}
function readEarlyToggle(input: HTMLInputElement | null) {
  if (input && input.checked !== input.defaultChecked) {
    saveFamilyPlan(input.checked);
  }
}
function subscribe(update: () => void) {
  window.addEventListener("fuellock-plan-change", update);
  return () => window.removeEventListener("fuellock-plan-change", update);
}
export function useFamilyPlan() {
  return useSyncExternalStore(
    subscribe,
    () => window.sessionStorage.getItem(key) === "yes",
    () => false,
  );
}
export function FamilyPlanToggle() {
  const enabled = useFamilyPlan();
  return (
    <label className="rule-check">
      <input
        type="checkbox"
        checked={enabled}
        ref={readEarlyToggle}
        onChange={(e) => saveFamilyPlan(e.target.checked)}
      />
      Include Family {usd(familyPlanCents)}/mo
    </label>
  );
}
