"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";

import { ChangelogOutput } from "@/components/ChangelogOutput";
import { RepoSelector } from "@/components/RepoSelector";
import { TagRangeSelector } from "@/components/TagRangeSelector";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type UsageResponse = {
  email: string;
  usage: {
    currentMonth: number;
    lifetime: number;
  };
};

export function ReleaseGenerator() {
  const [repo, setRepo] = useState("");
  const [baseTag, setBaseTag] = useState("");
  const [headTag, setHeadTag] = useState("");
  const [notes, setNotes] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usage, setUsage] = useState<UsageResponse | null>(null);

  useEffect(() => {
    const loadUsage = async () => {
      const response = await fetch("/api/usage", { cache: "no-store" });
      if (!response.ok) {
        return;
      }

      const payload = (await response.json()) as UsageResponse;
      setUsage(payload);
    };

    void loadUsage();
  }, []);

  const canGenerate = useMemo(() => {
    return Boolean(repo && baseTag && headTag && baseTag !== headTag);
  }, [repo, baseTag, headTag]);

  const generate = async () => {
    if (!canGenerate) {
      setError("Select a repository and two different tags.");
      return;
    }

    setError(null);
    setIsGenerating(true);

    try {
      const response = await fetch("/api/generate-changelog", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          repoFullName: repo,
          baseTag,
          headTag
        })
      });

      const payload = (await response.json()) as {
        markdown?: string;
        error?: string;
        usage?: UsageResponse["usage"];
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to generate release notes.");
      }

      setNotes(payload.markdown ?? "");
      if (payload.usage && usage) {
        setUsage({ ...usage, usage: payload.usage });
      }
    } catch (generationError) {
      setError(generationError instanceof Error ? generationError.message : "Failed to generate release notes.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-slate-800 bg-[#101722]">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="text-xl">Generate Changelog</CardTitle>
              <CardDescription>Pick a repo and compare two tags to create end-user release notes.</CardDescription>
            </div>
            {usage ? (
              <Badge variant="success">
                {usage.usage.currentMonth} this month · {usage.usage.lifetime} total
              </Badge>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <RepoSelector
            value={repo}
            onChange={(nextRepo) => {
              setRepo(nextRepo);
              setBaseTag("");
              setHeadTag("");
            }}
          />

          <TagRangeSelector
            repoFullName={repo}
            baseTag={baseTag}
            headTag={headTag}
            onBaseTagChange={setBaseTag}
            onHeadTagChange={setHeadTag}
          />

          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" onClick={() => void generate()} disabled={isGenerating || !canGenerate}>
              {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {isGenerating ? "Generating..." : "Generate Release Notes"}
            </Button>
            <p className="text-xs text-slate-400">Powered by GitHub API + OpenAI. Output is ready to paste into GitHub Releases.</p>
          </div>

          {error ? <p className="text-sm text-rose-300">{error}</p> : null}
        </CardContent>
      </Card>

      {notes ? <ChangelogOutput markdown={notes} /> : null}
    </div>
  );
}
