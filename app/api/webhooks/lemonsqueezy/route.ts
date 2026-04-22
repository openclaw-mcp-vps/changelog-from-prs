import Stripe from "stripe";
import { NextResponse } from "next/server";

import { recordPurchase } from "@/lib/database";
import { extractCheckoutEmail, isSuccessfulCheckoutEvent } from "@/lib/lemonsqueezy";

export const runtime = "nodejs";

function getStripeClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    return null;
  }

  return new Stripe(secretKey, {
    apiVersion: "2025-10-29.clover"
  });
}

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get("stripe-signature");

  if (!webhookSecret) {
    return NextResponse.json({ error: "Missing STRIPE_WEBHOOK_SECRET" }, { status: 500 });
  }

  if (!signature) {
    return NextResponse.json({ error: "Missing Stripe signature" }, { status: 400 });
  }

  const stripe = getStripeClient();
  if (!stripe) {
    return NextResponse.json({ error: "Missing STRIPE_SECRET_KEY" }, { status: 500 });
  }

  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid webhook signature.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (isSuccessfulCheckoutEvent(event.type)) {
    const session = event.data.object as Stripe.Checkout.Session;
    const email = extractCheckoutEmail(session);

    if (email) {
      await recordPurchase(email, "stripe");
    }
  }

  return NextResponse.json({ received: true });
}
