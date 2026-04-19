"use client";

import { useState } from "react";
import { WandSparkles } from "lucide-react";
import { RepoSelector } from "@/components/RepoSelector";
import { TagRangeSelector } from "@/components/TagRangeSelector";
import { ChangelogOutput } from "@/components/ChangelogOutput";
import { Button } from "@/components/ui/button";

interface GenerateWorkspaceProps {
  canGenerate: boolean;
}

export function GenerateWorkspace({ canGenerate }: GenerateWorkspaceProps) {
  const [repository, setRepository] = useState("");
  const [fromTag, setFromTag] = useState("");
  const [toTag, setToTag] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [markdown, setMarkdown] = useState("");
  const [model, setModel] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [stats, setStats] = useState<{
    pullRequests: number;
    commits: number;
    compareUrl: string;
  } | null>(null);

  async function handleGenerate() {
    setCopied(false);
    setError(null);

    if (!repository.trim() || !fromTag || !toTag) {
      setError("Choose a repository and both tags before generating.");
      return;
    }

    if (!canGenerate) {
      setError("Purchase access before generating release notes.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/generate-changelog", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          repository,
          fromTag,
          toTag
        })
      });

      const payload = (await response.json()) as {
        markdown?: string;
        model?: string;
        stats?: {
          pullRequests: number;
          commits: number;
          compareUrl: string;
        };
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to generate changelog");
      }

      setMarkdown(payload.markdown ?? "");
      setModel(payload.model ?? null);
      setStats(payload.stats ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown generation error");
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (!markdown.trim()) {
      return;
    }

    await navigator.clipboard.writeText(markdown);
    setCopied(true);

    setTimeout(() => {
      setCopied(false);
    }, 1500);
  }

  return (
    <div className="space-y-4">
      <RepoSelector value={repository} onChange={setRepository} />
      <TagRangeSelector
        repository={repository}
        fromTag={fromTag}
        toTag={toTag}
        onFromTagChange={setFromTag}
        onToTagChange={setToTag}
      />

      <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 md:p-5">
        <Button
          size="lg"
          onClick={() => void handleGenerate()}
          disabled={loading || !repository || !fromTag || !toTag || !canGenerate}
          className="w-full gap-2 md:w-auto"
        >
          <WandSparkles className="h-4 w-4" />
          {loading ? "Generating release notes..." : "Generate Changelog"}
        </Button>
        {!canGenerate ? (
          <p className="mt-3 text-sm text-amber-200">
            Paid access is required to run generation. Unlock a plan from the dashboard.
          </p>
        ) : null}
      </div>

      <ChangelogOutput
        markdown={markdown}
        loading={loading}
        copied={copied}
        onCopy={() => void handleCopy()}
        stats={stats}
        model={model}
        error={error}
      />
    </div>
  );
}
