"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface AccessState {
  active: boolean;
  credits: number;
  subscriptionEndsAt: string | null;
}

declare global {
  interface Window {
    LemonSqueezy?: {
      Url?: {
        Open: (url: string) => void;
      };
    };
  }
}

interface PricingCardsProps {
  compact?: boolean;
  initialAccess?: AccessState;
  onAccessChange?: (state: AccessState) => void;
}

async function fetchAccess() {
  const response = await fetch("/api/pay/access", { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Unable to refresh access status");
  }

  return (await response.json()) as AccessState;
}

export function PricingCards({ compact = false, initialAccess, onAccessChange }: PricingCardsProps) {
  const [access, setAccess] = useState<AccessState>(
    initialAccess ?? {
      active: false,
      credits: 0,
      subscriptionEndsAt: null
    }
  );
  const [loadingPlan, setLoadingPlan] = useState<"single" | "monthly" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const interval = setInterval(async () => {
      try {
        const latest = await fetchAccess();
        if (!mounted) {
          return;
        }

        setAccess(latest);
        onAccessChange?.(latest);
      } catch {
        // silent background polling
      }
    }, 8000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [onAccessChange]);

  const accessLabel = useMemo(() => {
    if (!access.active) {
      return "Locked";
    }

    if (access.subscriptionEndsAt) {
      return `Active until ${new Date(access.subscriptionEndsAt).toLocaleDateString()}`;
    }

    return `${access.credits} release credit${access.credits === 1 ? "" : "s"} remaining`;
  }, [access]);

  async function startCheckout(plan: "single" | "monthly") {
    setLoadingPlan(plan);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch("/api/pay/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ plan })
      });

      if (!response.ok) {
        throw new Error("Unable to start checkout");
      }

      const payload = (await response.json()) as { checkoutUrl: string };
      if (!payload.checkoutUrl) {
        throw new Error("Checkout URL not available");
      }

      if (window.LemonSqueezy?.Url?.Open) {
        window.LemonSqueezy.Url.Open(payload.checkoutUrl);
      } else {
        window.open(payload.checkoutUrl, "_blank", "noopener,noreferrer");
      }

      setSuccessMessage("Checkout opened. Access unlocks automatically after payment confirmation.");

      const latest = await fetchAccess();
      setAccess(latest);
      onAccessChange?.(latest);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown checkout error");
    } finally {
      setLoadingPlan(null);
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-sm text-slate-300">
        <span className="inline-flex items-center gap-2">
          <CheckCircle2 className={`h-4 w-4 ${access.active ? "text-emerald-400" : "text-slate-600"}`} />
          Paywall status: {accessLabel}
        </span>
      </div>

      <div className={`grid gap-4 ${compact ? "md:grid-cols-2" : "lg:grid-cols-2"}`}>
        <Card className="surface-glow border-cyan-500/30">
          <CardHeader>
            <CardTitle>Pay Per Release</CardTitle>
            <CardDescription>$5 for one generated changelog.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2 text-sm text-slate-300">
              <li>One release-note generation credit</li>
              <li>Works with any repo history</li>
              <li>Ideal for occasional maintainers</li>
            </ul>
            <Button className="w-full" onClick={() => void startCheckout("single")} disabled={loadingPlan !== null}>
              {loadingPlan === "single" ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Opening checkout...
                </span>
              ) : (
                "Unlock 1 Release"
              )}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Unlimited Monthly</CardTitle>
            <CardDescription>$19 per month for unlimited release generations.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2 text-sm text-slate-300">
              <li>Unlimited changelogs while subscription is active</li>
              <li>Best for active open-source projects</li>
              <li>No PR title conventions required</li>
            </ul>
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => void startCheckout("monthly")}
              disabled={loadingPlan !== null}
            >
              {loadingPlan === "monthly" ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Opening checkout...
                </span>
              ) : (
                "Start Unlimited"
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {successMessage ? (
        <p className="rounded-xl border border-cyan-400/30 bg-cyan-500/10 p-3 text-sm text-cyan-200">{successMessage}</p>
      ) : null}

      {error ? <p className="rounded-xl border border-rose-400/30 bg-rose-500/10 p-3 text-sm text-rose-200">{error}</p> : null}
    </section>
  );
}
