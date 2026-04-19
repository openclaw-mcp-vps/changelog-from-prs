"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Card } from "@/components/ui/card";

interface TagSummary {
  name: string;
  commitSha: string;
  commitUrl: string;
}

interface TagRangeSelectorProps {
  repository: string;
  fromTag: string;
  toTag: string;
  onFromTagChange: (value: string) => void;
  onToTagChange: (value: string) => void;
}

export function TagRangeSelector({
  repository,
  fromTag,
  toTag,
  onFromTagChange,
  onToTagChange
}: TagRangeSelectorProps) {
  const [tags, setTags] = useState<TagSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadTags() {
      if (!repository.trim()) {
        setTags([]);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/github/tags?repo=${encodeURIComponent(repository)}`, {
          cache: "no-store"
        });

        if (!response.ok) {
          throw new Error("Unable to load tags");
        }

        const payload = (await response.json()) as { tags: TagSummary[] };
        const loadedTags = payload.tags ?? [];
        setTags(loadedTags);

        if (loadedTags.length > 1) {
          if (!toTag) {
            onToTagChange(loadedTags[0].name);
          }
          if (!fromTag) {
            onFromTagChange(loadedTags[1].name);
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    void loadTags();
  }, [repository]);

  const missingTags = useMemo(() => repository.trim() && tags.length < 2, [repository, tags.length]);

  return (
    <Card className="space-y-4 p-4 md:p-5">
      <p className="text-sm font-semibold text-slate-200">2. Pick Tag Range</p>

      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label htmlFor="from-tag" className="mb-2 block text-xs uppercase tracking-wide text-slate-400">
            Base Tag
          </label>
          <div className="relative">
            <select
              id="from-tag"
              value={fromTag}
              onChange={(event) => onFromTagChange(event.target.value)}
              disabled={loading || tags.length === 0}
              className="h-11 w-full appearance-none rounded-xl border border-slate-700 bg-slate-950/70 px-3 pr-10 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-50"
            >
              <option value="">Select base tag</option>
              {tags.map((tag) => (
                <option key={tag.commitSha} value={tag.name}>
                  {tag.name}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-3.5 h-4 w-4 text-slate-500" />
          </div>
        </div>

        <div>
          <label htmlFor="to-tag" className="mb-2 block text-xs uppercase tracking-wide text-slate-400">
            Target Tag
          </label>
          <div className="relative">
            <select
              id="to-tag"
              value={toTag}
              onChange={(event) => onToTagChange(event.target.value)}
              disabled={loading || tags.length === 0}
              className="h-11 w-full appearance-none rounded-xl border border-slate-700 bg-slate-950/70 px-3 pr-10 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-50"
            >
              <option value="">Select target tag</option>
              {tags.map((tag) => (
                <option key={tag.name} value={tag.name}>
                  {tag.name}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-3.5 h-4 w-4 text-slate-500" />
          </div>
        </div>
      </div>

      {loading ? <p className="text-sm text-slate-400">Loading tags...</p> : null}
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
      {missingTags ? (
        <p className="text-sm text-amber-200">
          This repository has fewer than two tags. Create semantic tags (for example v1.2.0) before generating changelogs.
        </p>
      ) : null}
    </Card>
  );
}
