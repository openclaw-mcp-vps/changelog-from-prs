import { Octokit } from "@octokit/rest";

export type RepositorySummary = {
  id: number;
  fullName: string;
  isPrivate: boolean;
  defaultBranch: string;
  updatedAt: string;
};

export type TagSummary = {
  name: string;
  commitSha: string;
};

export type PullRequestSummary = {
  number: number;
  title: string;
  body: string;
  author: string;
  labels: string[];
  mergedAt: string;
  url: string;
};

export type CommitSummary = {
  sha: string;
  message: string;
  author: string;
  date: string;
  url: string;
};

export type GitRangeData = {
  repoFullName: string;
  baseTag: string;
  headTag: string;
  totalCommits: number;
  totalPullRequests: number;
  pulls: PullRequestSummary[];
  commits: CommitSummary[];
};

function parseRepo(fullName: string) {
  const [owner, repo] = fullName.split("/");
  if (!owner || !repo) {
    throw new Error("Repository must be in owner/repo format");
  }

  return {
    owner,
    repo
  };
}

function withToken(token: string) {
  return new Octokit({ auth: token });
}

export async function fetchAuthenticatedGitHubUser(token: string) {
  const octokit = withToken(token);
  const { data } = await octokit.rest.users.getAuthenticated();

  return {
    login: data.login,
    avatarUrl: data.avatar_url,
    profileUrl: data.html_url,
    email: data.email
  };
}

export async function fetchUserRepos(token: string): Promise<RepositorySummary[]> {
  const octokit = withToken(token);
  const repos = await octokit.paginate(octokit.rest.repos.listForAuthenticatedUser, {
    sort: "updated",
    per_page: 100,
    visibility: "all"
  });

  return repos
    .map((repo) => ({
      id: repo.id,
      fullName: repo.full_name,
      isPrivate: repo.private,
      defaultBranch: repo.default_branch,
      updatedAt: repo.updated_at ?? repo.pushed_at ?? new Date(0).toISOString()
    }))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 150);
}

export async function fetchRepoTags(token: string, repoFullName: string): Promise<TagSummary[]> {
  const { owner, repo } = parseRepo(repoFullName);
  const octokit = withToken(token);

  const tags = await octokit.paginate(octokit.rest.repos.listTags, {
    owner,
    repo,
    per_page: 100
  });

  return tags.slice(0, 200).map((tag) => ({
    name: tag.name,
    commitSha: tag.commit.sha
  }));
}

export async function fetchPullRequestsAndCommitsBetweenTags(
  token: string,
  repoFullName: string,
  baseTag: string,
  headTag: string
): Promise<GitRangeData> {
  const { owner, repo } = parseRepo(repoFullName);
  const octokit = withToken(token);

  const compare = await octokit.rest.repos.compareCommitsWithBasehead({
    owner,
    repo,
    basehead: `${baseTag}...${headTag}`,
    per_page: 250
  });

  const commits: CommitSummary[] = (compare.data.commits ?? []).map((commit) => ({
    sha: commit.sha,
    message: commit.commit.message,
    author: commit.author?.login ?? commit.commit.author?.name ?? "unknown",
    date: commit.commit.author?.date ?? new Date().toISOString(),
    url: commit.html_url
  }));

  const prMap = new Map<number, PullRequestSummary>();
  const commitLinkedToPr = new Set<string>();

  for (const commit of commits) {
    try {
      const associatedPulls = await octokit.rest.repos.listPullRequestsAssociatedWithCommit({
        owner,
        repo,
        commit_sha: commit.sha
      });

      for (const pr of associatedPulls.data) {
        if (!pr.merged_at) {
          continue;
        }

        commitLinkedToPr.add(commit.sha);

        if (!prMap.has(pr.number)) {
          prMap.set(pr.number, {
            number: pr.number,
            title: pr.title,
            body: pr.body ?? "",
            author: pr.user?.login ?? "unknown",
            labels: pr.labels.map((label) => (typeof label === "string" ? label : label.name ?? "")).filter(Boolean),
            mergedAt: pr.merged_at,
            url: pr.html_url
          });
        }
      }
    } catch {
      // A missing PR association for a commit is valid. Keep processing remaining commits.
    }
  }

  const pulls = Array.from(prMap.values()).sort((a, b) => a.mergedAt.localeCompare(b.mergedAt));
  const directCommits = commits.filter((commit) => !commitLinkedToPr.has(commit.sha));

  return {
    repoFullName,
    baseTag,
    headTag,
    totalCommits: commits.length,
    totalPullRequests: pulls.length,
    pulls,
    commits: directCommits
  };
}
