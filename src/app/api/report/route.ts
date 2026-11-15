import { NextResponse } from "next/server";
import { z } from "zod";
import { identity, verifyOrigin } from "@/server/session";
import { snapshot } from "@/server/snapshot";
import { report, reportFacts } from "@/server/domain/report";
import { aiConfigured, narrate } from "@/server/providers/ai-report";
import { Problem } from "@/server/domain/validation";
export async function POST(req: Request) {
  try {
    verifyOrigin(req);
    const a = await identity();
    if (!a)
      return NextResponse.json({ error: "Session expired." }, { status: 401 });
    if (!aiConfigured())
      return NextResponse.json(
        { error: "AI highlights are not configured." },
        { status: 503 },
      );
    const { month } = z
      .object({ month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/) })
      .parse(await req.json());
    const facts = reportFacts(report(await snapshot(a), month));
    return NextResponse.json({ highlights: await narrate(facts) });
  } catch (e) {
    if (e instanceof Problem)
      return NextResponse.json({ error: e.message }, { status: e.status });
    if (e instanceof z.ZodError)
      return NextResponse.json(
        { error: "Invalid month or model response." },
        { status: 422 },
      );
    return NextResponse.json(
      {
        error:
          "AI highlights are unavailable. The verified monthly figures are shown below.",
      },
      { status: 503 },
    );
  }
}
