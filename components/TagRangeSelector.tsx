"use client";

import { useEffect, useState } from "react";
import { GitCompare } from "lucide-react";

type Tag = {
  name: string;
  commitSha: string;
};

type TagRangeSelectorProps = {
  repoFullName: string;
  baseTag: string;
  headTag: string;
  onBaseTagChange: (tag: string) => void;
  onHeadTagChange: (tag: string) => void;
};

export function TagRangeSelector({
  repoFullName,
  baseTag,
  headTag,
  onBaseTagChange,
  onHeadTagChange
}: TagRangeSelectorProps) {
  const [tags, setTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!repoFullName) {
      setTags([]);
      return;
    }

    const controller = new AbortController();

    const loadTags = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/github/tags?repo=${encodeURIComponent(repoFullName)}`, {
          signal: controller.signal,
          cache: "no-store"
        });

        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as { error?: string } | null;
          throw new Error(payload?.error ?? "Unable to load tags.");
        }

        const payload = (await response.json()) as { tags: Tag[] };
        const tagList = payload.tags;
        setTags(tagList);

        if (!baseTag && tagList.length > 1) {
          onBaseTagChange(tagList[1].name);
        }

        if (!headTag && tagList.length > 0) {
          onHeadTagChange(tagList[0].name);
        }
      } catch (loadError) {
        if (controller.signal.aborted) {
          return;
        }

        const message = loadError instanceof Error ? loadError.message : "Unable to load tags.";
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };

    void loadTags();

    return () => controller.abort();
  }, [repoFullName, baseTag, headTag, onBaseTagChange, onHeadTagChange]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-slate-200">
        <GitCompare className="h-4 w-4 text-cyan-400" />
        Compare tag range
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label htmlFor="base-tag" className="text-xs uppercase tracking-wide text-slate-400">
            From
          </label>
          <select
            id="base-tag"
            value={baseTag}
            onChange={(event) => onBaseTagChange(event.target.value)}
            className="h-10 w-full rounded-md border border-slate-700 bg-slate-900 px-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            disabled={isLoading || tags.length === 0}
          >
            <option value="">Select base tag</option>
            {tags.map((tag) => (
              <option key={`base-${tag.name}`} value={tag.name}>
                {tag.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label htmlFor="head-tag" className="text-xs uppercase tracking-wide text-slate-400">
            To
          </label>
          <select
            id="head-tag"
            value={headTag}
            onChange={(event) => onHeadTagChange(event.target.value)}
            className="h-10 w-full rounded-md border border-slate-700 bg-slate-900 px-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            disabled={isLoading || tags.length === 0}
          >
            <option value="">Select target tag</option>
            {tags.map((tag) => (
              <option key={`head-${tag.name}`} value={tag.name}>
                {tag.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error ? <p className="text-xs text-rose-300">{error}</p> : null}
      {!error && isLoading ? <p className="text-xs text-slate-400">Loading tags...</p> : null}
      {!error && !isLoading && tags.length === 0 ? (
        <p className="text-xs text-slate-400">This repository has no tags yet.</p>
      ) : null}
    </div>
  );
}
