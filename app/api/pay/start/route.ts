import { NextRequest, NextResponse } from "next/server";
import { createCheckoutSession, generateOpaqueToken } from "@/lib/database";
import {
  type BillingPlan,
  buildCheckoutUrl,
  ensureAccessTokenOnResponse,
  getRequestAccessToken,
  inferAppOrigin
} from "@/lib/lemonsqueezy";

interface StartPayload {
  plan?: BillingPlan;
}

export async function POST(request: NextRequest) {
  let payload: StartPayload;
  try {
    payload = (await request.json()) as StartPayload;
  } catch {
    payload = {};
  }

  const plan = payload.plan === "monthly" ? "monthly" : "single";
  const existingToken = getRequestAccessToken(request);
  const accessToken = existingToken ?? generateOpaqueToken();

  await createCheckoutSession({ accessToken, plan });

  const checkoutUrl = buildCheckoutUrl({
    plan,
    accessToken,
    origin: inferAppOrigin(request)
  });

  const response = NextResponse.json({ checkoutUrl, accessToken });
  ensureAccessTokenOnResponse(response, accessToken);
  return response;
}
