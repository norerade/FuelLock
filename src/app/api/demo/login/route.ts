import { NextResponse } from "next/server";
import { ready, write } from "@/server/db/client";
import { Problem } from "@/server/domain/validation";
import { seedFamily } from "@/server/providers/demo";
import {
  identity,
  newSession,
  sessionOptions,
  verifyOrigin,
} from "@/server/session";
import { loginDestination } from "@/server/workspace-paths";

export async function POST(request: Request) {
  try {
    verifyOrigin(request);
  } catch (error) {
    if (error instanceof Problem)
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    throw error;
  }
  const destination = loginDestination(
    new URL(request.url).searchParams.get("next"),
  );
  const response = new NextResponse(null, {
    status: 303,
    headers: { Location: destination, "Cache-Control": "no-store" },
  });
  if (await identity()) return response;
  await ready();
  const token = await write(async (tx) => {
    const { family, driver } = await seedFamily(tx);
    return newSession(tx, family, driver);
  });
  response.cookies.set("fuellock_session", token, sessionOptions(request));
  return response;
}
