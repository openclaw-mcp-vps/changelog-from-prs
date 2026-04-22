import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { getSessionEmail, getUsageSummary } from "@/lib/database";

export async function GET() {
  const cookieStore = await cookies();
  const session = cookieStore.get("paid_session")?.value;
  const email = await getSessionEmail(session);

  if (!email) {
    return NextResponse.json({ error: "No active paid session." }, { status: 401 });
  }

  const usage = await getUsageSummary(email);

  return NextResponse.json({
    email,
    usage
  });
}
