import Link from "next/link";
import { cookies } from "next/headers";
import { ArrowRight, LockKeyhole, LogOut, PlugZap } from "lucide-react";

import { PricingCards } from "@/components/PricingCards";
import { UnlockPurchaseForm } from "@/components/UnlockPurchaseForm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getSessionEmail, getUsageSummary } from "@/lib/database";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const githubToken = cookieStore.get("gh_token")?.value;
  const githubLogin = cookieStore.get("gh_login")?.value;

  const paidToken = cookieStore.get("paid_session")?.value;
  const paidEmail = await getSessionEmail(paidToken);
  const usage = paidEmail ? await getUsageSummary(paidEmail) : null;

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 pb-20 pt-12 md:px-10">
      <header className="space-y-3">
        <Badge>Dashboard</Badge>
        <h1 className="text-3xl font-semibold text-slate-100">Release notes workspace</h1>
        <p className="max-w-3xl text-slate-300">
          Connect GitHub, unlock access from your Stripe purchase email, and generate release notes from any version tag range.
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="bg-[#101722]">
          <CardHeader>
            <CardTitle className="text-xl">1) GitHub connection</CardTitle>
            <CardDescription>OAuth is required to read repos, tags, PRs, and commit history.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-300">
              {githubToken ? `Connected as ${githubLogin ?? "GitHub user"}.` : "No GitHub account connected yet."}
            </p>
            {githubToken ? (
              <Button asChild variant="outline">
                <Link href="/api/auth/github?action=logout">
                  <LogOut className="h-4 w-4" />
                  Disconnect GitHub
                </Link>
              </Button>
            ) : (
              <Button asChild>
                <Link href="/api/auth/github">
                  <PlugZap className="h-4 w-4" />
                  Connect GitHub
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>

        <Card className="bg-[#101722]">
          <CardHeader>
            <CardTitle className="text-xl">2) Paid access</CardTitle>
            <CardDescription>The generation endpoint is locked behind a paid cookie session.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {paidEmail ? (
              <>
                <p className="text-sm text-emerald-300">Unlocked for {paidEmail}</p>
                <p className="text-sm text-slate-300">
                  Usage this month: {usage?.currentMonth ?? 0} releases. Lifetime: {usage?.lifetime ?? 0} releases.
                </p>
              </>
            ) : (
              <>
                <p className="text-sm text-slate-300">Complete Stripe checkout, then unlock with the same purchase email.</p>
                <UnlockPurchaseForm />
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {githubToken && paidEmail ? (
        <Card className="border-cyan-500/20 bg-cyan-500/5">
          <CardHeader>
            <CardTitle className="text-xl">Ready to generate</CardTitle>
            <CardDescription>Your account has both required gates enabled.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/generate">
                Open Generator
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-amber-500/20 bg-amber-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl text-amber-100">
              <LockKeyhole className="h-5 w-5" />
              Complete both steps to unlock the tool
            </CardTitle>
            <CardDescription>
              Connect GitHub and confirm your Stripe purchase email. The generator will stay locked until both are active.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-slate-100">Need a plan first?</h2>
        <PricingCards />
      </section>
    </main>
  );
}
