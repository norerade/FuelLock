import { NextResponse } from "next/server";
import { ready, write } from "@/server/db/client";
import { seedFamily } from "@/server/providers/demo";
import { newSession, identity, sessionOptions } from "@/server/session";
export async function GET(request: Request) {
  await ready();
  const next = new URL(request.url).searchParams.get("next") || "/";
  const destination = /^\/[a-z-]*$/.test(next) ? next : "/";
  const response = new NextResponse(null, {
    status: 303,
    headers: { Location: destination, "Cache-Control": "no-store" },
  });
  if (!(await identity())) {
    const token = await write(async (tx) => {
      const { family, driver } = await seedFamily(tx);
      return newSession(tx, family, driver);
    });
    response.cookies.set("fuellock_session", token, sessionOptions(request));
  }
  return response;
}
