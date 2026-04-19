import Link from "next/link";
import { cookies } from "next/headers";
import { LockKeyhole, GitBranch } from "lucide-react";
import { GenerateWorkspace } from "@/components/GenerateWorkspace";
import { PricingCards } from "@/components/PricingCards";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { GITHUB_USER_COOKIE } from "@/lib/github";
import { getServerAccessSnapshot } from "@/lib/lemonsqueezy";

export const dynamic = "force-dynamic";

export default async function GeneratePage() {
  const cookieStore = await cookies();
  const githubUser = cookieStore.get(GITHUB_USER_COOKIE)?.value ?? null;
  const access = await getServerAccessSnapshot();

  return (
    <main className="mx-auto max-w-5xl px-4 pb-20 pt-8 sm:px-6">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-[family-name:var(--font-heading)] text-3xl text-slate-100">Generate Release Notes</h1>
          <p className="text-sm text-slate-400">Select a tag range and generate end-user changelog markdown in one pass.</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link href="/">Home</Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href="/dashboard">Dashboard</Link>
          </Button>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {githubUser ? <Badge>GitHub: @{githubUser}</Badge> : <Badge className="border-amber-400/30 bg-amber-500/10 text-amber-200">GitHub disconnected</Badge>}
        {access.active ? (
          <Badge>Paid Access Active</Badge>
        ) : (
          <Badge className="border-amber-400/30 bg-amber-500/10 text-amber-200">Paywall Locked</Badge>
        )}
      </div>

      {!githubUser ? (
        <Card className="mb-6 space-y-3 p-5">
          <div className="inline-flex items-center gap-2 text-slate-200">
            <GitBranch className="h-4 w-4 text-cyan-300" />
            Connect GitHub before generating changelogs.
          </div>
          <Button asChild>
            <Link href="/api/auth/github?next=/generate">Connect GitHub</Link>
          </Button>
        </Card>
      ) : null}

      {!access.active ? (
        <Card className="mb-6 space-y-4 p-5">
          <div className="inline-flex items-center gap-2 text-slate-200">
            <LockKeyhole className="h-4 w-4 text-cyan-300" />
            Purchase access to run the generator.
          </div>
          <PricingCards compact initialAccess={access} />
        </Card>
      ) : null}

      <GenerateWorkspace canGenerate={Boolean(githubUser) && access.active} />
    </main>
  );
}
