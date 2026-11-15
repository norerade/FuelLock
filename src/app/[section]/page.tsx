import { renderWorkspace } from "@/server/workspace";
export default async function Page({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  return renderWorkspace((await params).section);
}
