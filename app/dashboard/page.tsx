import Link from "next/link";
import { cookies } from "next/headers";
import { ArrowRight, GitBranch, Lock, Sparkles } from "lucide-react";
import { PricingCards } from "@/components/PricingCards";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { listGenerationHistory } from "@/lib/database";
import { ACCESS_TOKEN_COOKIE } from "@/lib/lemonsqueezy";
import { GITHUB_USER_COOKIE } from "@/lib/github";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const githubUser = cookieStore.get(GITHUB_USER_COOKIE)?.value ?? null;
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value ?? null;

  const generations = accessToken ? await listGenerationHistory(accessToken, 20) : [];

  return (
    <main className="mx-auto max-w-6xl px-4 pb-20 pt-8 sm:px-6">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-[family-name:var(--font-heading)] text-3xl text-slate-100">Dashboard</h1>
          <p className="text-sm text-slate-400">Connect GitHub, unlock access, and review recent generation history.</p>
        </div>
        <Button asChild variant="ghost">
          <Link href="/">Back to Home</Link>
        </Button>
      </div>

      <section className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GitBranch className="h-5 w-5 text-cyan-300" />
              GitHub Connection
            </CardTitle>
            <CardDescription>OAuth is required for repository, tag, and PR access.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {githubUser ? (
              <>
                <Badge>Connected as @{githubUser}</Badge>
                <div className="flex flex-wrap gap-2">
                  <Button asChild>
                    <Link href="/generate">Open Generator</Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link href="/api/auth/github?logout=1&next=/dashboard">Disconnect</Link>
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-slate-300">Connect your account to load repositories and compare tags.</p>
                <Button asChild>
                  <Link href="/api/auth/github?next=/dashboard">Connect GitHub</Link>
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-cyan-300" />
              Access & Billing
            </CardTitle>
            <CardDescription>The generator is paywalled per release or via monthly subscription.</CardDescription>
          </CardHeader>
          <CardContent>
            <PricingCards compact />
          </CardContent>
        </Card>
      </section>

      <section className="mt-10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-[family-name:var(--font-heading)] text-2xl text-slate-100">Generation History</h2>
          <Button asChild variant="secondary" className="gap-2">
            <Link href="/generate">
              New Generation
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        {generations.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-sm text-slate-400">
              <div className="inline-flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-cyan-300" />
                No generated releases yet. Connect GitHub and create your first changelog.
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {generations.map((item) => (
              <Card key={item.id} className="p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold text-slate-100">{item.repository}</p>
                    <p className="text-xs text-slate-500">
                      {item.fromTag} → {item.toTag} • {new Date(item.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <Badge>
                    {item.sourcePrCount} PRs / {item.sourceCommitCount} commits
                  </Badge>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
