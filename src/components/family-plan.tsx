"use client";
import { useSyncExternalStore } from "react";
import { familyPlanCents, usd } from "@/server/domain/money";
const key = "fuellock-include-family-plan";
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
        onChange={(e) => {
          window.sessionStorage.setItem(key, e.target.checked ? "yes" : "no");
          window.dispatchEvent(new Event("fuellock-plan-change"));
        }}
      />
      Include Family {usd(familyPlanCents)}/mo
    </label>
  );
}
