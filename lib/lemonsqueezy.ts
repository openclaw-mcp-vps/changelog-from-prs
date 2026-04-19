import crypto from "node:crypto";
import type { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { generateOpaqueToken, getAccessSnapshot } from "@/lib/database";

export const ACCESS_TOKEN_COOKIE = "cfpr_access_token";
export const PAID_ACCESS_COOKIE = "cfpr_paid_access";

export type BillingPlan = "single" | "monthly";

const COOKIE_MAX_AGE = 60 * 60 * 24 * 90;

export function inferAppOrigin(request: Request) {
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const forwardedHost = request.headers.get("x-forwarded-host");

  if (forwardedProto && forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }

  return new URL(request.url).origin;
}

export function getRequestAccessToken(request: NextRequest) {
  return request.cookies.get(ACCESS_TOKEN_COOKIE)?.value ?? null;
}

export function ensureAccessTokenOnResponse(response: NextResponse, existingToken?: string | null) {
  const token = existingToken ?? generateOpaqueToken();

  response.cookies.set(ACCESS_TOKEN_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: COOKIE_MAX_AGE
  });

  return token;
}

export function writePaidCookie(response: NextResponse, isPaid: boolean) {
  if (isPaid) {
    response.cookies.set(PAID_ACCESS_COOKIE, "1", {
      httpOnly: true,
      sameSite: "lax",
      secure: true,
      path: "/",
      maxAge: COOKIE_MAX_AGE
    });
  } else {
    response.cookies.delete(PAID_ACCESS_COOKIE);
  }
}

function normalizeCheckoutBase(value: string) {
  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }

  const storeId = process.env.NEXT_PUBLIC_LEMON_SQUEEZY_STORE_ID;
  if (storeId && !/^\\d+$/.test(storeId)) {
    return `https://${storeId}.lemonsqueezy.com/buy/${value}`;
  }

  return `https://checkout.lemonsqueezy.com/buy/${value}`;
}

export function buildCheckoutUrl(params: {
  plan: BillingPlan;
  accessToken: string;
  origin: string;
}) {
  const defaultProduct = process.env.NEXT_PUBLIC_LEMON_SQUEEZY_PRODUCT_ID;
  const subscriptionProduct = process.env.NEXT_PUBLIC_LEMON_SQUEEZY_SUBSCRIPTION_PRODUCT_ID;

  const selectedProduct = params.plan === "monthly" ? subscriptionProduct ?? defaultProduct : defaultProduct;

  if (!selectedProduct) {
    throw new Error("Missing NEXT_PUBLIC_LEMON_SQUEEZY_PRODUCT_ID");
  }

  const url = new URL(normalizeCheckoutBase(selectedProduct));
  url.searchParams.set("embed", "1");
  url.searchParams.set("checkout[custom][access_token]", params.accessToken);
  url.searchParams.set("checkout[custom][plan]", params.plan);
  url.searchParams.set("checkout[custom][source]", "changelog-from-prs");
  url.searchParams.set("checkout[success_url]", `${params.origin}/dashboard?checkout=success`);

  return url.toString();
}

export function verifyWebhookSignature(rawBody: string, signature: string | null) {
  const secret = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET;

  if (!secret || !signature) {
    return false;
  }

  const digest = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  const safeDigest = Buffer.from(digest, "utf8");
  const safeSignature = Buffer.from(signature, "utf8");

  if (safeDigest.length !== safeSignature.length) {
    return false;
  }

  return crypto.timingSafeEqual(safeDigest, safeSignature);
}

export async function getServerAccessSnapshot() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;

  if (!token) {
    return {
      accessToken: null,
      active: false,
      credits: 0,
      subscriptionEndsAt: null
    };
  }

  const snapshot = await getAccessSnapshot(token);

  return {
    accessToken: token,
    ...snapshot
  };
}

export function resolvePlanFromPayload(payload: unknown): BillingPlan {
  if (!payload || typeof payload !== "object") {
    return "single";
  }

  const customData = (payload as { meta?: { custom_data?: Record<string, unknown> } }).meta?.custom_data;
  if (!customData) {
    return "single";
  }

  return customData.plan === "monthly" ? "monthly" : "single";
}

export function resolveAccessTokenFromPayload(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const customData = (payload as { meta?: { custom_data?: Record<string, unknown> } }).meta?.custom_data;
  const token = customData?.access_token;

  return typeof token === "string" && token.length > 0 ? token : null;
}
