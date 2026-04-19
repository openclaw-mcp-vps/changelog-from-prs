"use client";

import { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import { Copy, CheckCircle2, Sparkles, GitPullRequest, GitCommit } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface ChangelogOutputProps {
  markdown: string;
  loading: boolean;
  copied: boolean;
  onCopy: () => void;
  stats?: {
    pullRequests: number;
    commits: number;
    compareUrl: string;
  } | null;
  model?: string | null;
  error?: string | null;
}

export function ChangelogOutput({
  markdown,
  loading,
  copied,
  onCopy,
  stats,
  model,
  error
}: ChangelogOutputProps) {
  const hasContent = useMemo(() => markdown.trim().length > 0, [markdown]);

  return (
    <Card className="space-y-4 p-4 md:p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-200">3. Changelog Output</p>
          <p className="text-xs text-slate-500">Designed for release announcements, not commit archaeology.</p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={onCopy}
          disabled={!hasContent || loading}
          className="gap-2"
        >
          {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? "Copied" : "Copy Markdown"}
        </Button>
      </div>

      {stats ? (
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-900 px-2 py-1">
            <GitPullRequest className="h-3.5 w-3.5" />
            {stats.pullRequests} PRs
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-900 px-2 py-1">
            <GitCommit className="h-3.5 w-3.5" />
            {stats.commits} commits
          </span>
          {model ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-900 px-2 py-1">
              <Sparkles className="h-3.5 w-3.5" />
              {model}
            </span>
          ) : null}
          <a
            href={stats.compareUrl}
            target="_blank"
            rel="noreferrer"
            className="text-cyan-300 underline underline-offset-4 hover:text-cyan-200"
          >
            Open GitHub comparison
          </a>
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-xl border border-cyan-400/30 bg-cyan-500/10 p-6 text-sm text-cyan-100">
          Reading PRs and commits, then drafting user-facing release notes...
        </div>
      ) : null}

      {error ? <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 p-4 text-sm text-rose-200">{error}</div> : null}

      {hasContent ? (
        <article className="prose prose-invert max-w-none rounded-xl border border-slate-800 bg-slate-950/70 p-4 prose-headings:font-[family-name:var(--font-heading)] prose-headings:text-slate-100 prose-p:text-slate-300 prose-a:text-cyan-300 prose-strong:text-slate-100 prose-li:text-slate-300">
          <ReactMarkdown>{markdown}</ReactMarkdown>
        </article>
      ) : !loading ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6 text-sm text-slate-500">
          Your generated release notes will appear here.
        </div>
      ) : null}
    </Card>
  );
}
