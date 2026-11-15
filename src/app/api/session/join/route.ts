import { NextResponse } from "next/server";
import { ready, write } from "@/server/db/client";
import { newSession, sessionOptions, verifyOrigin } from "@/server/session";
import { requireThat, Problem } from "@/server/domain/validation";
export async function POST(req: Request) {
  try {
    verifyOrigin(req);
    await ready();
    const id = String((await req.formData()).get("token"));
    const token = await write(async (tx) => {
      const row = (
        await tx.execute({
          sql: "SELECT * FROM invites WHERE id=? AND used=0 AND expires>?",
          args: [id, new Date().toISOString()],
        })
      ).rows[0];
      requireThat(
        row,
        "This invitation was used or expired. Ask the owner for a new link.",
        410,
      );
      await tx.execute({
        sql: "UPDATE invites SET used=1 WHERE id=?",
        args: [id],
      });
      return newSession(tx, String(row.family), String(row.driver));
    });
    const res = new NextResponse(null, {
      status: 303,
      headers: { Location: "/" },
    });
    res.cookies.set("fuellock_session", token, sessionOptions(req));
    return res;
  } catch (e) {
    if (e instanceof Problem)
      return new Response(e.message, { status: e.status });
    throw e;
  }
}
