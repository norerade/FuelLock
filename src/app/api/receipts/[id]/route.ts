import { identity } from "@/server/session";
import { client } from "@/server/db/client";
export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const a = await identity();
  if (!a) return new Response("Session expired.", { status: 401 });
  const { id } = await params;
  const file = (
    await client.execute({
      sql: "SELECT content,name,mime FROM receipts WHERE family=? AND id=?",
      args: [a.family, id],
    })
  ).rows[0];
  if (!file) return new Response("Receipt not found.", { status: 404 });
  return new Response(file.content as ArrayBuffer, {
    headers: {
      "Content-Type": String(file.mime),
      "Content-Disposition":
        "attachment; filename*=UTF-8''" + encodeURIComponent(String(file.name)),
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
