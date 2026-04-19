import { NextRequest, NextResponse } from "next/server";
import { getAccessSnapshot } from "@/lib/database";
import {
  ensureAccessTokenOnResponse,
  getRequestAccessToken,
  writePaidCookie
} from "@/lib/lemonsqueezy";

export async function GET(request: NextRequest) {
  const token = getRequestAccessToken(request);

  if (!token) {
    const response = NextResponse.json({
      active: false,
      credits: 0,
      subscriptionEndsAt: null
    });

    ensureAccessTokenOnResponse(response, null);
    writePaidCookie(response, false);
    return response;
  }

  const snapshot = await getAccessSnapshot(token);
  const response = NextResponse.json(snapshot);
  ensureAccessTokenOnResponse(response, token);
  writePaidCookie(response, snapshot.active);

  return response;
}
