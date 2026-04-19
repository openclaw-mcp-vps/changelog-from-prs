"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, RefreshCw, GitBranch } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface RepositoryItem {
  id: number;
  fullName: string;
  private: boolean;
  defaultBranch: string;
  updatedAt: string;
}

interface RepoSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

export function RepoSelector({ value, onChange }: RepoSelectorProps) {
  const [repos, setRepos] = useState<RepositoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(true);

  const filtered = useMemo(() => {
    if (!value.trim()) {
      return repos.slice(0, 8);
    }

    return repos
      .filter((repo) => repo.fullName.toLowerCase().includes(value.toLowerCase()))
      .slice(0, 8);
  }, [repos, value]);

  async function loadRepos() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/github/repos", { cache: "no-store" });

      if (response.status === 401) {
        setConnected(false);
        setRepos([]);
        return;
      }

      if (!response.ok) {
        throw new Error("Unable to load repositories");
      }

      const payload = (await response.json()) as { repositories: RepositoryItem[] };
      setConnected(true);
      setRepos(payload.repositories ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadRepos();
  }, []);

  return (
    <Card className="space-y-4 p-4 md:p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-200">1. Choose Repository</p>
        <Button variant="ghost" size="sm" onClick={() => void loadRepos()} className="gap-1.5">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-500" />
        <Input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="owner/repo or paste GitHub URL"
          className="pl-10"
        />
      </div>

      {!connected ? (
        <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-3 text-sm text-amber-200">
          Connect GitHub first to load your repositories automatically.
        </div>
      ) : null}

      {error ? <div className="text-sm text-rose-300">{error}</div> : null}

      {filtered.length > 0 ? (
        <div className="grid gap-2">
          {filtered.map((repo) => (
            <button
              key={repo.id}
              type="button"
              onClick={() => onChange(repo.fullName)}
              className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2 text-left transition hover:border-cyan-400/50"
            >
              <span className="truncate text-sm text-slate-200">{repo.fullName}</span>
              <span className="ml-3 text-xs text-slate-500">{repo.private ? "Private" : repo.defaultBranch}</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <GitBranch className="h-4 w-4" />
          {loading ? "Loading repositories..." : "Type to filter repositories"}
        </div>
      )}
    </Card>
  );
}
