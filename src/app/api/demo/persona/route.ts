import { NextResponse } from "next/server";
import { client } from "@/server/db/client";
import { identity, sessionOptions, verifyOrigin } from "@/server/session";
import { Problem, requireThat } from "@/server/domain/validation";

export async function POST(req: Request) {
  try {
    verifyOrigin(req);
    const actor = await identity();
    requireThat(
      actor?.canSwitchPersona,
      "Only the demo owner can switch personas.",
      403,
    );
    const target = String((await req.formData()).get("driver") ?? "");
    if (target) {
      const driver = await client.execute({
        sql: "SELECT id FROM drivers WHERE family=? AND role='driver' AND id=?",
        args: [actor.family, target],
      });
      requireThat(driver.rows.length, "Unknown demo driver.", 400);
    }
    const response = new NextResponse(null, {
      status: 303,
      headers: { Location: "/overview", "Cache-Control": "no-store" },
    });
    const options = sessionOptions(req);
    response.cookies.set("fuellock_persona", target, {
      ...options,
      maxAge: target ? options.maxAge : 0,
    });
    return response;
  } catch (error) {
    if (error instanceof Problem)
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    throw error;
  }
}
