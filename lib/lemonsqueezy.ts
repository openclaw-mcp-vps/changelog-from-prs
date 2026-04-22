import type Stripe from "stripe";

export function getStripePaymentLink() {
  return process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK ?? "";
}

export function extractCheckoutEmail(session: Stripe.Checkout.Session): string | null {
  return session.customer_details?.email ?? session.customer_email ?? null;
}

export function isSuccessfulCheckoutEvent(type: string) {
  return type === "checkout.session.completed";
}
