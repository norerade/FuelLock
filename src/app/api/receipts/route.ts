import { events } from "@/server/events";
import { NextResponse } from "next/server";
import { z } from "zod";
import { identity, verifyOrigin } from "@/server/session";
import { write } from "@/server/db/client";
import { Problem, requireThat } from "@/server/domain/validation";
import { attachEvidence } from "@/server/domain/receipts";
export async function POST(req: Request) {
  try {
    verifyOrigin(req);
    const a = await identity();
    requireThat(a, "Session expired.", 401);
    requireThat(
      Number(req.headers.get("content-length") ?? 0) <= 3_300_000,
      "Receipt limit is 3 MB.",
      413,
    );
    const form = await req.formData();
    const fields: Record<string, string> = {};
    for (const [k, v] of form) if (typeof v === "string") fields[k] = v;
    const item = form.get("file");
    let file: { name: string; bytes: Buffer; mime: string } | undefined;
    if (item instanceof File && item.size) {
      requireThat(item.size <= 3_000_000, "Receipt limit is 3 MB.", 413);
      const bytes = Buffer.from(await item.arrayBuffer());
      const head = bytes.subarray(0, 8).toString("hex");
      const mime = head.startsWith("255044462d")
        ? "application/pdf"
        : head === "89504e470d0a1a0a"
          ? "image/png"
          : head.startsWith("ffd8ff")
            ? "image/jpeg"
            : "";
      requireThat(mime, "Use a PDF, PNG or JPEG receipt.");
      file = { name: item.name, bytes, mime };
    }
    const result = await write((tx) => attachEvidence(tx, a, fields, file));
    events.emit(a.family);
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof Problem || e instanceof z.ZodError)
      return NextResponse.json(
        {
          error:
            e instanceof Problem
              ? e.message
              : "Check the purchase details and time.",
        },
        { status: e instanceof Problem ? e.status : 422 },
      );
    console.error("Receipt could not be saved", e);
    return NextResponse.json(
      { error: "Receipt could not be saved." },
      { status: 500 },
    );
  }
}
