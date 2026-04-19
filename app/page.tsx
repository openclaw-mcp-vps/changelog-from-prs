import Link from "next/link";
import { ArrowRight, GitBranchPlus, History, Sparkles, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PricingCards } from "@/components/PricingCards";

const faqs = [
  {
    question: "Why not use conventional commits or release-please?",
    answer:
      "Most projects have inconsistent PR titles and merge habits. Changelog from PRs reads the actual PR and commit history, then writes end-user notes without requiring strict conventions."
  },
  {
    question: "Does it work for private repositories?",
    answer:
      "Yes. GitHub OAuth uses your own access token and only reads repos you can already access."
  },
  {
    question: "What counts as one paid release?",
    answer:
      "One generation run for a selected tag range. If you use the monthly plan, runs are unlimited while the subscription is active."
  },
  {
    question: "Can I edit the generated notes?",
    answer:
      "Yes. Output is markdown, so you can copy, tweak, and publish it to GitHub Releases, docs, or your changelog file."
  }
];

export default function HomePage() {
  return (
    <main className="mx-auto max-w-6xl px-4 pb-20 pt-8 sm:px-6 md:pt-12">
      <header className="fade-up">
        <div className="mb-10 flex flex-wrap items-center justify-between gap-4">
          <Link href="/" className="font-[family-name:var(--font-heading)] text-xl font-bold text-slate-100">
            Changelog from PRs
          </Link>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link href="/dashboard">Dashboard</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/generate">Try the Generator</Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr] lg:items-center">
          <div className="space-y-5">
            <Badge>Release tools for maintainers</Badge>
            <h1 className="font-[family-name:var(--font-heading)] text-4xl font-bold tracking-tight text-slate-100 sm:text-5xl">
              Changelog from PRs
              <span className="mt-2 block text-cyan-300">Generate release notes people actually read</span>
            </h1>
            <p className="max-w-2xl text-lg text-slate-300">
              Paste a repository and tag range. We read every PR and commit, then write release notes grouped by Features,
              Fixes, and Breaking Changes in plain language for users.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Button asChild size="lg" className="gap-2">
                <Link href="/generate">
                  Generate a Release
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="#pricing">See Pricing</Link>
              </Button>
            </div>
            <p className="text-sm text-slate-500">$5 per release or $19/mo unlimited for active maintainers.</p>
          </div>

          <Card className="surface-glow fade-up-delay p-6">
            <div className="space-y-4 text-sm text-slate-300">
              <p className="text-xs uppercase tracking-wide text-slate-500">How it works</p>
              <div className="grid gap-3">
                <div className="flex items-start gap-3">
                  <GitBranchPlus className="mt-0.5 h-4 w-4 text-cyan-300" />
                  <p>Connect GitHub and choose a repository with version tags.</p>
                </div>
                <div className="flex items-start gap-3">
                  <History className="mt-0.5 h-4 w-4 text-cyan-300" />
                  <p>We analyze PRs and commits between your selected tags.</p>
                </div>
                <div className="flex items-start gap-3">
                  <Sparkles className="mt-0.5 h-4 w-4 text-cyan-300" />
                  <p>AI drafts customer-ready notes grouped by impact.</p>
                </div>
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 h-4 w-4 text-cyan-300" />
                  <p>Copy markdown and publish to GitHub Releases or docs in seconds.</p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </header>

      <section className="mt-20 grid gap-6 md:grid-cols-2">
        <Card className="p-6">
          <h2 className="font-[family-name:var(--font-heading)] text-2xl text-slate-100">The problem</h2>
          <p className="mt-3 text-slate-300">
            Teams skip release notes because commit logs are noisy and PR naming is inconsistent. Traditional automation expects
            strict conventions that open-source projects rarely enforce.
          </p>
        </Card>

        <Card className="p-6">
          <h2 className="font-[family-name:var(--font-heading)] text-2xl text-slate-100">The solution</h2>
          <p className="mt-3 text-slate-300">
            Changelog from PRs reads your real history, understands what changed, and writes release notes for users. No
            migration, no commit policy rewrites, no manual synthesis.
          </p>
        </Card>
      </section>

      <section id="pricing" className="mt-20">
        <div className="mb-6">
          <h2 className="font-[family-name:var(--font-heading)] text-3xl text-slate-100">Pricing</h2>
          <p className="mt-2 text-slate-400">Start with a single release or switch to unlimited when your project cadence grows.</p>
        </div>
        <PricingCards />
      </section>

      <section className="mt-20">
        <h2 className="font-[family-name:var(--font-heading)] text-3xl text-slate-100">FAQ</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {faqs.map((faq) => (
            <Card key={faq.question} className="p-5">
              <h3 className="font-[family-name:var(--font-heading)] text-lg text-slate-100">{faq.question}</h3>
              <p className="mt-2 text-sm text-slate-300">{faq.answer}</p>
            </Card>
          ))}
        </div>
      </section>
    </main>
  );
}
