import { NextRequest, NextResponse } from "next/server";
import { grantEntitlement } from "@/lib/database";
import {
  resolveAccessTokenFromPayload,
  resolvePlanFromPayload,
  verifyWebhookSignature
} from "@/lib/lemonsqueezy";

function resolveSubscriptionEnd(payload: Record<string, unknown>) {
  const attributes = (payload.data as { attributes?: Record<string, unknown> } | undefined)?.attributes;
  const renewsAt = attributes?.renews_at;
  const endsAt = attributes?.ends_at;

  if (typeof renewsAt === "string" && renewsAt.length > 0) {
    return renewsAt;
  }

  if (typeof endsAt === "string" && endsAt.length > 0) {
    return endsAt;
  }

  return null;
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-signature");
  const secret = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET;

  if (secret && !verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid webhook payload" }, { status: 400 });
  }

  const eventName =
    (payload.meta as { event_name?: string } | undefined)?.event_name ??
    (payload as { event_name?: string }).event_name ??
    "unknown";

  const paidEvents = new Set([
    "order_created",
    "order_paid",
    "subscription_created",
    "subscription_payment_success",
    "subscription_resumed",
    "subscription_updated"
  ]);

  if (!paidEvents.has(eventName)) {
    return NextResponse.json({ received: true, ignored: eventName });
  }

  const accessToken = resolveAccessTokenFromPayload(payload);
  if (!accessToken) {
    return NextResponse.json({ received: true, ignored: "missing_access_token" });
  }

  const plan = resolvePlanFromPayload(payload);
  const lemonOrderId = String((payload.data as { id?: string } | undefined)?.id ?? "");

  await grantEntitlement({
    accessToken,
    plan,
    lemonOrderId: lemonOrderId || undefined,
    subscriptionEndsAt: plan === "monthly" ? resolveSubscriptionEnd(payload) : null
  });

  return NextResponse.json({ received: true, eventName });
}
