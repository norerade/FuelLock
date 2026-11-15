import { notFound, redirect } from "next/navigation";
import { identity } from "./session";
import { snapshot } from "./snapshot";
import Workspace from "@/components/workspace";
import { isWorkspacePath } from "./workspace-paths";
export async function renderWorkspace(section: string) {
  const path = "/" + section;
  if (!isWorkspacePath(path)) notFound();
  const actor = await identity();
  if (!actor) redirect("/login?next=" + encodeURIComponent(path));
  if (section === "partner" && actor.role !== "owner") notFound();
  return <Workspace s={await snapshot(actor)} section={section} />;
}
