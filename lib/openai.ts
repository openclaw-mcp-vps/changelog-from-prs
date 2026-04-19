import OpenAI from "openai";
import type { TagRangeData } from "@/lib/github";

interface ChangelogResult {
  markdown: string;
  model: string;
}

function trimForPrompt(value: string, maxLen: number) {
  if (value.length <= maxLen) {
    return value;
  }

  return `${value.slice(0, maxLen - 3)}...`;
}

function fallbackChangelog(data: TagRangeData): ChangelogResult {
  const breaking: string[] = [];
  const features: string[] = [];
  const fixes: string[] = [];

  for (const pr of data.pullRequests) {
    const text = `${pr.title} ${pr.body}`.toLowerCase();
    const line = `- ${pr.title} ([#${pr.number}](${pr.htmlUrl}))`;

    if (text.includes("breaking") || text.includes("deprecat") || text.includes("migration")) {
      breaking.push(line);
    } else if (text.includes("fix") || text.includes("bug") || text.includes("regression")) {
      fixes.push(line);
    } else {
      features.push(line);
    }
  }

  const commitOnly = data.commits.filter((commit) => !commit.associatedPrNumber).slice(0, 12);
  const commitLines = commitOnly.map((commit) => `- ${commit.message} ([${commit.shortSha}](${commit.htmlUrl}))`);

  const markdown = [
    `# ${data.repository} Release ${data.toTag}`,
    "",
    `Compared with **${data.fromTag}**. This release includes ${data.pullRequests.length} pull requests and ${data.commits.length} commits.`,
    "",
    "## Breaking Changes",
    breaking.length ? breaking.join("\n") : "- No breaking changes were identified.",
    "",
    "## Features",
    features.length ? features.join("\n") : "- No new end-user features were identified.",
    "",
    "## Fixes",
    fixes.length ? fixes.join("\n") : "- No user-facing fixes were identified.",
    "",
    "## Additional Changes",
    commitLines.length ? commitLines.join("\n") : "- Additional commit-level changes are included with no direct PR mapping.",
    "",
    `Full comparison: ${data.compareUrl}`
  ].join("\n");

  return {
    markdown,
    model: "fallback-rules"
  };
}

export async function generateChangelogWithAI(data: TagRangeData): Promise<ChangelogResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL ?? "gpt-4.1-mini";

  if (!apiKey) {
    return fallbackChangelog(data);
  }

  const openai = new OpenAI({ apiKey });

  const compactInput = {
    repository: data.repository,
    fromTag: data.fromTag,
    toTag: data.toTag,
    compareUrl: data.compareUrl,
    pullRequests: data.pullRequests.map((pr) => ({
      number: pr.number,
      title: trimForPrompt(pr.title, 180),
      body: trimForPrompt(pr.body || "", 800),
      labels: pr.labels,
      url: pr.htmlUrl,
      mergedAt: pr.mergedAt,
      author: pr.author
    })),
    commits: data.commits.slice(0, 250).map((commit) => ({
      shortSha: commit.shortSha,
      message: trimForPrompt(commit.message, 180),
      author: commit.author,
      associatedPrNumber: commit.associatedPrNumber,
      url: commit.htmlUrl
    }))
  };

  const systemPrompt =
    "You are a release manager who writes changelogs for end users. You never write like a Git commit log. Keep language clear, outcome-focused, and concise.";

  const userPrompt = [
    "Generate markdown release notes using exactly these top-level sections in this order:",
    "1) # <repo> Release <toTag>",
    "2) ## Breaking Changes",
    "3) ## Features",
    "4) ## Fixes",
    "5) ## Upgrade Notes",
    "6) ## Full Changelog",
    "",
    "Rules:",
    "- Group content by user impact, not implementation details.",
    "- Mention PR number links where available.",
    "- Skip empty sections by writing one bullet saying there were no notable items.",
    "- In Upgrade Notes, include action items if breaking changes exist.",
    "- Use short bullets, no nested bullets.",
    "",
    "Data:",
    JSON.stringify(compactInput)
  ].join("\n");

  try {
    const completion = await openai.chat.completions.create({
      model,
      temperature: 0.25,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ]
    });

    const markdown = completion.choices[0]?.message?.content?.trim();

    if (!markdown) {
      return fallbackChangelog(data);
    }

    return {
      markdown,
      model
    };
  } catch {
    return fallbackChangelog(data);
  }
}
