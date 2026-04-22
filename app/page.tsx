import Link from "next/link";
import { ArrowRight, Bot, GitPullRequestArrow, ShieldCheck, Sparkle } from "lucide-react";

import { PricingCards } from "@/components/PricingCards";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const faqs = [
  {
    question: "Do I need Conventional Commits or release-please labels?",
    answer:
      "No. The generator reads PR bodies, labels, linked commits, and direct commit messages, then rewrites everything for end users."
  },
  {
    question: "Can this work with private repositories?",
    answer:
      "Yes. Connect GitHub through OAuth and choose private repos from your own account or org access."
  },
  {
    question: "How does the paywall work?",
    answer:
      "Checkout runs on Stripe-hosted Payment Links. After purchase, confirm your purchase email once in the dashboard to unlock cookie-based access."
  },
  {
    question: "What format is the output?",
    answer: "Markdown optimized for GitHub Releases, changelog files, blog updates, and customer emails."
  }
];

export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-20 px-6 pb-24 pt-12 md:px-10">
      <section className="relative overflow-hidden rounded-3xl border border-slate-800 bg-[#0f1724] p-8 md:p-12">
        <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-cyan-500/20 blur-3xl" aria-hidden />
        <div className="absolute -bottom-20 left-10 h-52 w-52 rounded-full bg-blue-500/20 blur-3xl" aria-hidden />

        <div className="relative grid gap-8 md:grid-cols-[1.1fr_0.9fr] md:items-center">
          <div className="space-y-6">
            <Badge>Release Notes Automation</Badge>
            <h1 className="text-4xl font-semibold leading-tight text-slate-100 md:text-5xl">
              Changelog from PRs
              <span className="block text-cyan-300">Paste a repo + tag range, ship release notes your users can understand.</span>
            </h1>
            <p className="max-w-2xl text-lg text-slate-300">
              Stop spending release day rewriting technical PR titles. This tool scans every PR and direct commit between versions,
              then produces clear, user-facing notes grouped into Features, Fixes, and Breaking Changes.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link href="/dashboard">
                  Connect GitHub
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="#pricing">See Pricing</Link>
              </Button>
            </div>
          </div>

          <Card className="border-slate-700/80 bg-slate-950/60">
            <CardHeader>
              <CardTitle className="text-lg">Why maintainers pay for this</CardTitle>
              <CardDescription>Ship notes faster without enforcing contributor formatting rules.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-slate-300">
              <p className="flex items-start gap-2">
                <GitPullRequestArrow className="mt-0.5 h-4 w-4 text-cyan-300" />
                Works on any commit history, including messy PR titles and mixed contribution styles.
              </p>
              <p className="flex items-start gap-2">
                <Bot className="mt-0.5 h-4 w-4 text-cyan-300" />
                AI rewrites implementation details into customer impact language.
              </p>
              <p className="flex items-start gap-2">
                <ShieldCheck className="mt-0.5 h-4 w-4 text-cyan-300" />
                Stripe checkout and cookie-based access keeps the generation endpoint paywalled.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="space-y-6">
        <h2 className="text-3xl font-semibold text-slate-100">The problem with release tooling today</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="bg-[#101722]">
            <CardHeader>
              <CardTitle className="text-lg">Convention lock-in</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-slate-300">
              Most generators need strict commit prefixes or PR label discipline. Real-world repos rarely stay that clean.
            </CardContent>
          </Card>
          <Card className="bg-[#101722]">
            <CardHeader>
              <CardTitle className="text-lg">Manual rewrite fatigue</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-slate-300">
              Maintainers still hand-edit each release because raw commit text is too technical for users.
            </CardContent>
          </Card>
          <Card className="bg-[#101722]">
            <CardHeader>
              <CardTitle className="text-lg">Slow release cycles</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-slate-300">
              Changelog cleanup becomes the bottleneck right when teams need to publish quickly.
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="space-y-6">
        <h2 className="text-3xl font-semibold text-slate-100">How Changelog from PRs solves it</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="bg-[#101722]">
            <CardHeader>
              <Sparkle className="h-5 w-5 text-cyan-300" />
              <CardTitle className="text-lg">Select tag range</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-slate-300">Pick any two versions to analyze exactly what changed between releases.</CardContent>
          </Card>
          <Card className="bg-[#101722]">
            <CardHeader>
              <Sparkle className="h-5 w-5 text-cyan-300" />
              <CardTitle className="text-lg">Read all PRs + commits</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-slate-300">
              The app gathers merged PRs and direct commits so edge cases do not disappear from notes.
            </CardContent>
          </Card>
          <Card className="bg-[#101722]">
            <CardHeader>
              <Sparkle className="h-5 w-5 text-cyan-300" />
              <CardTitle className="text-lg">Generate end-user notes</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-slate-300">
              Output arrives grouped by Feature, Fix, and Breaking Change with upgrade context ready to publish.
            </CardContent>
          </Card>
        </div>
      </section>

      <section id="pricing" className="space-y-6">
        <h2 className="text-3xl font-semibold text-slate-100">Pricing for independent maintainers</h2>
        <p className="text-slate-300">
          Start per release, then switch to unlimited when your project ships often. Checkout is handled directly by Stripe.
        </p>
        <PricingCards />
      </section>

      <section className="space-y-6">
        <h2 className="text-3xl font-semibold text-slate-100">FAQ</h2>
        <div className="grid gap-4">
          {faqs.map((faq) => (
            <Card key={faq.question} className="bg-[#101722]">
              <CardHeader>
                <CardTitle className="text-lg">{faq.question}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-slate-300">{faq.answer}</CardContent>
            </Card>
          ))}
        </div>
      </section>
    </main>
  );
}
