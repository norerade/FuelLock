import { notFound, redirect } from "next/navigation";
import { identity } from "./session";
import { snapshot } from "./snapshot";
import Workspace from "@/components/workspace";
export async function renderWorkspace(section: string) {
  if (
    ![
      "",
      "protection",
      "activity",
      "wallet",
      "household",
      "partner",
      "trips",
      "goals",
      "settings",
      "reports",
    ].includes(section)
  )
    notFound();
  const actor = await identity();
  if (!actor) redirect("/api/demo?next=/" + section);
  if (section === "partner" && actor.role !== "owner") notFound();
  return <Workspace s={await snapshot(actor)} section={section} />;
}
