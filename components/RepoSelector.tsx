"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Github, RefreshCcw } from "lucide-react";

import { Button } from "@/components/ui/button";

type Repo = {
  id: number;
  fullName: string;
  isPrivate: boolean;
  updatedAt: string;
};

type RepoSelectorProps = {
  value: string;
  onChange: (repo: string) => void;
};

export function RepoSelector({ value, onChange }: RepoSelectorProps) {
  const [repos, setRepos] = useState<Repo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRepos = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/github/repos", { cache: "no-store" });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? "Unable to load repositories.");
      }

      const payload = (await response.json()) as { repos: Repo[] };
      setRepos(payload.repos);
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : "Unable to load repositories.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRepos();
  }, [loadRepos]);

  const statusText = useMemo(() => {
    if (isLoading) {
      return "Loading repositories...";
    }

    if (error) {
      return error;
    }

    if (repos.length === 0) {
      return "No repositories found for this account.";
    }

    return `${repos.length} repositories available`;
  }, [error, isLoading, repos.length]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label htmlFor="repo-selector" className="text-sm font-medium text-slate-200">
          Repository
        </label>
        <Button type="button" size="sm" variant="ghost" onClick={() => void loadRepos()}>
          <RefreshCcw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      <div className="relative">
        <Github className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <select
          id="repo-selector"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-10 w-full rounded-md border border-slate-700 bg-slate-900 pl-9 pr-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          disabled={isLoading || Boolean(error)}
        >
          <option value="">Select a repository</option>
          {repos.map((repo) => (
            <option key={repo.id} value={repo.fullName}>
              {repo.fullName}
              {repo.isPrivate ? " (private)" : ""}
            </option>
          ))}
        </select>
      </div>

      <p className="text-xs text-slate-400">{statusText}</p>
    </div>
  );
}
