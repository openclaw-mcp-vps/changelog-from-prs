import { Octokit } from "@octokit/rest";
import type { NextRequest, NextResponse } from "next/server";
import { inferAppOrigin } from "@/lib/lemonsqueezy";

export const GITHUB_TOKEN_COOKIE = "cfpr_github_token";
export const GITHUB_USER_COOKIE = "cfpr_github_user";
export const GITHUB_STATE_COOKIE = "cfpr_github_state";

export interface GitHubRepository {
  id: number;
  fullName: string;
  private: boolean;
  defaultBranch: string;
  updatedAt: string;
}

export interface TagSummary {
  name: string;
  commitSha: string;
  commitUrl: string;
}

export interface PullRequestSummary {
  number: number;
  title: string;
  body: string;
  htmlUrl: string;
  mergedAt: string | null;
  labels: string[];
  author: string;
}

export interface CommitSummary {
  sha: string;
  shortSha: string;
  message: string;
  htmlUrl: string;
  author: string;
  committedAt: string;
  associatedPrNumber?: number;
}

export interface TagRangeData {
  repository: string;
  fromTag: string;
  toTag: string;
  compareUrl: string;
  pullRequests: PullRequestSummary[];
  commits: CommitSummary[];
}

function requireGitHubEnv() {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Missing GITHUB_CLIENT_ID or GITHUB_CLIENT_SECRET");
  }

  return { clientId, clientSecret };
}

function mapWithConcurrency<T, R>(items: T[], limit: number, mapper: (item: T) => Promise<R>) {
  const workers = Math.min(limit, items.length);
  const results = new Array<R>(items.length);
  let index = 0;

  return Promise.all(
    Array.from({ length: workers }, async () => {
      while (true) {
        const current = index;
        index += 1;

        if (current >= items.length) {
          break;
        }

        results[current] = await mapper(items[current]);
      }
    })
  ).then(() => results);
}

export function parseRepositoryInput(input: string) {
  const trimmed = input.trim();

  if (!trimmed) {
    throw new Error("Repository is required");
  }

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    const url = new URL(trimmed);
    const parts = url.pathname.split("/").filter(Boolean);

    if (parts.length < 2) {
      throw new Error("Repository URL must include owner and repo");
    }

    return {
      owner: parts[0],
      repo: parts[1].replace(/\.git$/, "")
    };
  }

  const parts = trimmed.split("/").filter(Boolean);
  if (parts.length !== 2) {
    throw new Error("Repository must be in owner/name format");
  }

  return {
    owner: parts[0],
    repo: parts[1]
  };
}

export function createOctokit(authToken: string) {
  return new Octokit({
    auth: authToken
  });
}

export function getGitHubTokenFromRequest(request: NextRequest) {
  return request.cookies.get(GITHUB_TOKEN_COOKIE)?.value ?? null;
}

export function attachGitHubSessionCookies(params: {
  response: NextResponse;
  token: string;
  login: string;
}) {
  params.response.cookies.set(GITHUB_TOKEN_COOKIE, params.token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30
  });

  params.response.cookies.set(GITHUB_USER_COOKIE, params.login, {
    httpOnly: false,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30
  });
}

export async function listAuthenticatedRepos(authToken: string): Promise<GitHubRepository[]> {
  const octokit = createOctokit(authToken);

  const repos = await octokit.paginate(octokit.repos.listForAuthenticatedUser, {
    per_page: 100,
    sort: "updated",
    affiliation: "owner,collaborator,organization_member"
  });

  return repos
    .map((repo) => ({
      id: repo.id,
      fullName: repo.full_name,
      private: repo.private,
      defaultBranch: repo.default_branch,
      updatedAt: repo.updated_at ?? new Date().toISOString()
    }))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function listRepositoryTags(params: {
  authToken: string;
  owner: string;
  repo: string;
}): Promise<TagSummary[]> {
  const octokit = createOctokit(params.authToken);

  const tags = await octokit.paginate(octokit.repos.listTags, {
    owner: params.owner,
    repo: params.repo,
    per_page: 100
  });

  return tags.slice(0, 100).map((tag) => ({
    name: tag.name,
    commitSha: tag.commit.sha,
    commitUrl: tag.commit.url
  }));
}

export async function getTagRangeData(params: {
  authToken: string;
  owner: string;
  repo: string;
  fromTag: string;
  toTag: string;
}): Promise<TagRangeData> {
  const octokit = createOctokit(params.authToken);
  const compare = await octokit.repos.compareCommitsWithBasehead({
    owner: params.owner,
    repo: params.repo,
    basehead: `${params.fromTag}...${params.toTag}`,
    per_page: 250
  });

  const commits = compare.data.commits ?? [];
  const associatedPullRequests = await mapWithConcurrency(commits, 8, async (commit) => {
    try {
      const result = await octokit.repos.listPullRequestsAssociatedWithCommit({
        owner: params.owner,
        repo: params.repo,
        commit_sha: commit.sha,
        per_page: 10
      });

      return {
        sha: commit.sha,
        prs: result.data
      };
    } catch {
      return {
        sha: commit.sha,
        prs: []
      };
    }
  });

  const prByNumber = new Map<number, PullRequestSummary>();
  const prByCommit = new Map<string, number>();

  for (const item of associatedPullRequests) {
    for (const pr of item.prs) {
      if (!prByNumber.has(pr.number)) {
        prByNumber.set(pr.number, {
          number: pr.number,
          title: pr.title,
          body: pr.body ?? "",
          htmlUrl: pr.html_url,
          mergedAt: pr.merged_at,
          labels: pr.labels.map((label) => (typeof label === "string" ? label : label.name ?? "")).filter(Boolean),
          author: pr.user?.login ?? "unknown"
        });
      }

      if (!prByCommit.has(item.sha)) {
        prByCommit.set(item.sha, pr.number);
      }
    }
  }

  const normalizedCommits: CommitSummary[] = commits.map((commit) => ({
    sha: commit.sha,
    shortSha: commit.sha.slice(0, 7),
    message: commit.commit.message.split("\n")[0] ?? "No commit message",
    htmlUrl: commit.html_url,
    author: commit.author?.login ?? commit.commit.author?.name ?? "unknown",
    committedAt: commit.commit.author?.date ?? new Date().toISOString(),
    associatedPrNumber: prByCommit.get(commit.sha)
  }));

  const pullRequests = [...prByNumber.values()].sort((a, b) => a.number - b.number);

  return {
    repository: `${params.owner}/${params.repo}`,
    fromTag: params.fromTag,
    toTag: params.toTag,
    compareUrl: compare.data.html_url,
    pullRequests,
    commits: normalizedCommits
  };
}

export function buildGitHubAuthorizationUrl(request: NextRequest, state: string) {
  const { clientId } = requireGitHubEnv();
  const origin = inferAppOrigin(request);
  const callbackUrl = `${origin}/api/auth/github`;

  const authUrl = new URL("https://github.com/login/oauth/authorize");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", callbackUrl);
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("scope", "read:user repo");

  return authUrl.toString();
}

export async function exchangeGitHubCodeForToken(code: string, request: NextRequest) {
  const { clientId, clientSecret } = requireGitHubEnv();
  const callbackUrl = `${inferAppOrigin(request)}/api/auth/github`;

  const response = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: callbackUrl
    })
  });

  if (!response.ok) {
    throw new Error("Failed to exchange GitHub code for token");
  }

  const payload = (await response.json()) as {
    access_token?: string;
    error?: string;
    error_description?: string;
  };

  if (!payload.access_token) {
    throw new Error(payload.error_description ?? payload.error ?? "No access token returned");
  }

  return payload.access_token;
}

export async function fetchGitHubUser(authToken: string) {
  const octokit = createOctokit(authToken);
  const { data } = await octokit.users.getAuthenticated();

  return {
    id: data.id,
    login: data.login,
    avatarUrl: data.avatar_url,
    profileUrl: data.html_url
  };
}
