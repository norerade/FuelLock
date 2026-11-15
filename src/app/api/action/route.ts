import { events } from "@/server/events";
import { NextResponse } from "next/server";
import { z } from "zod";
import { identity, verifyOrigin } from "@/server/session";
import { write } from "@/server/db/client";
import { act } from "@/server/actions";
import { Problem, requireThat } from "@/server/domain/validation";
export async function POST(req: Request) {
  try {
    verifyOrigin(req);
    const a = await identity();
    requireThat(a, "Reopen the demo to start a session.", 401);
    const body = z
      .object({ action: z.string(), input: z.record(z.string(), z.unknown()) })
      .parse(await req.json());
    const result = await write((tx) => act(tx, a, body.action, body.input));
    if (body.action !== "preview") events.emit(a.family);
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof z.ZodError)
      return NextResponse.json(
        {
          error: e.issues
            .map((i) => i.path.join(".") + " " + i.message)
            .join(" · "),
        },
        { status: 422 },
      );
    if (e instanceof Problem)
      return NextResponse.json({ error: e.message }, { status: e.status });
    console.error("FuelLock action failed", e);
    return NextResponse.json(
      { error: "The change could not be saved. Try again." },
      { status: 500 },
    );
  }
}
