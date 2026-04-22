import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { createPaidSession, getUsageSummary, hasPurchase } from "@/lib/database";

type VerifyRequest = {
  email?: string;
};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as VerifyRequest;

  const email = body.email?.trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }

  const purchased = await hasPurchase(email);
  if (!purchased) {
    return NextResponse.json(
      {
        error: "No paid checkout found for this email yet. Complete Stripe checkout first, then retry."
      },
      { status: 404 }
    );
  }

  const session = await createPaidSession(email);
  const usage = await getUsageSummary(email);

  const cookieStore = await cookies();
  cookieStore.set("paid_session", session.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(session.expiresAt)
  });

  return NextResponse.json({
    message: "Purchase verified. Access unlocked.",
    usage
  });
}
