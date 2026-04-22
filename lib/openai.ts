import OpenAI from "openai";
import type { GitRangeData } from "@/lib/github";

const MODEL = process.env.OPENAI_MODEL ?? "gpt-4.1-mini";

type CategorizedSection = "Features" | "Fixes" | "Breaking Changes";

function inferSection(text: string): CategorizedSection {
  const lower = text.toLowerCase();

  if (
    lower.includes("break") ||
    lower.includes("deprecat") ||
    lower.includes("remove") ||
    lower.includes("rename") ||
    lower.includes("migration")
  ) {
    return "Breaking Changes";
  }

  if (
    lower.includes("fix") ||
    lower.includes("bug") ||
    lower.includes("patch") ||
    lower.includes("hotfix") ||
    lower.includes("error")
  ) {
    return "Fixes";
  }

  return "Features";
}

function fallbackReleaseNotes(data: GitRangeData) {
  const features: string[] = [];
  const fixes: string[] = [];
  const breaking: string[] = [];

  for (const pr of data.pulls) {
    const sentence = `${pr.title} ([#${pr.number}](${pr.url}))`;
    const section = inferSection(`${pr.title}\n${pr.body}\n${pr.labels.join(" ")}`);

    if (section === "Breaking Changes") {
      breaking.push(sentence);
      continue;
    }

    if (section === "Fixes") {
      fixes.push(sentence);
      continue;
    }

    features.push(sentence);
  }

  for (const commit of data.commits) {
    const subjectLine = commit.message.split("\n")[0];
    const sentence = `${subjectLine} ([${commit.sha.slice(0, 7)}](${commit.url}))`;
    const section = inferSection(subjectLine);

    if (section === "Breaking Changes") {
      breaking.push(sentence);
      continue;
    }

    if (section === "Fixes") {
      fixes.push(sentence);
      continue;
    }

    features.push(sentence);
  }

  const toBullets = (items: string[]) => (items.length > 0 ? items.map((item) => `- ${item}`).join("\n") : "- No notable changes.");

  return `# Release Notes\n\n**Repository:** ${data.repoFullName}  \n**Range:** ${data.baseTag} → ${data.headTag}\n\n## Features\n${toBullets(features)}\n\n## Fixes\n${toBullets(fixes)}\n\n## Breaking Changes\n${toBullets(breaking)}\n\n## Rollout Notes\n- Review breaking changes before deploying to production.\n- Validate critical workflows in staging before publishing this release.`;
}

export async function generateReleaseNotes(data: GitRangeData) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    return fallbackReleaseNotes(data);
  }

  const client = new OpenAI({ apiKey: key });

  const inputPayload = {
    repo: data.repoFullName,
    range: `${data.baseTag}...${data.headTag}`,
    pullRequests: data.pulls.map((pr) => ({
      number: pr.number,
      title: pr.title,
      body: pr.body,
      labels: pr.labels,
      author: pr.author
    })),
    directCommits: data.commits.map((commit) => ({
      sha: commit.sha,
      message: commit.message,
      author: commit.author
    }))
  };

  const response = await client.responses.create({
    model: MODEL,
    temperature: 0.2,
    input: [
      {
        role: "system",
        content:
          "You write release notes for end users, not developers. Group output into Features, Fixes, and Breaking Changes. Keep language plain and outcome-focused. Mention upgrade impact clearly. Return valid Markdown only."
      },
      {
        role: "user",
        content: `Create release notes for this GitHub range.\n\nJSON:\n${JSON.stringify(inputPayload, null, 2)}\n\nRules:\n- Start with title '# Release Notes'.\n- Add a short summary paragraph after the title.\n- Under each section use bullets and describe user-visible impact.\n- Include PR number references like #123 when possible.\n- If a section has no items, include a single bullet saying no notable changes.\n- Add final section '## Upgrade Notes' with deployment cautions and migration tips.`
      }
    ]
  });

  const text = response.output_text?.trim();

  if (!text) {
    return fallbackReleaseNotes(data);
  }

  return text;
}
