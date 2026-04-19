import { NextRequest, NextResponse } from "next/server";
import { consumeGeneration, getAccessSnapshot, recordGeneration } from "@/lib/database";
import { getGitHubTokenFromRequest, getTagRangeData, parseRepositoryInput } from "@/lib/github";
import { getRequestAccessToken } from "@/lib/lemonsqueezy";
import { generateChangelogWithAI } from "@/lib/openai";

interface GenerateRequestBody {
  repository?: string;
  fromTag?: string;
  toTag?: string;
}

export async function POST(request: NextRequest) {
  const accessToken = getRequestAccessToken(request);

  if (!accessToken) {
    return NextResponse.json({ error: "Purchase required before generating release notes" }, { status: 402 });
  }

  const snapshot = await getAccessSnapshot(accessToken);
  if (!snapshot.active) {
    return NextResponse.json(
      {
        error: "Your credits or subscription are not active. Complete checkout to continue."
      },
      { status: 402 }
    );
  }

  const githubToken = getGitHubTokenFromRequest(request);
  if (!githubToken) {
    return NextResponse.json({ error: "Connect GitHub before generating a changelog" }, { status: 401 });
  }

  let body: GenerateRequestBody;
  try {
    body = (await request.json()) as GenerateRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const repository = body.repository?.trim();
  const fromTag = body.fromTag?.trim();
  const toTag = body.toTag?.trim();

  if (!repository || !fromTag || !toTag) {
    return NextResponse.json({ error: "repository, fromTag, and toTag are required" }, { status: 400 });
  }

  try {
    const { owner, repo } = parseRepositoryInput(repository);
    const tagRangeData = await getTagRangeData({
      authToken: githubToken,
      owner,
      repo,
      fromTag,
      toTag
    });

    const aiResult = await generateChangelogWithAI(tagRangeData);
    const consumption = await consumeGeneration(accessToken);

    if (!consumption.allowed) {
      return NextResponse.json({ error: "No remaining paid access available" }, { status: 402 });
    }

    const generation = await recordGeneration({
      accessToken,
      repository: `${owner}/${repo}`,
      fromTag,
      toTag,
      markdown: aiResult.markdown,
      sourcePrCount: tagRangeData.pullRequests.length,
      sourceCommitCount: tagRangeData.commits.length
    });

    return NextResponse.json({
      generation,
      markdown: aiResult.markdown,
      model: aiResult.model,
      stats: {
        pullRequests: tagRangeData.pullRequests.length,
        commits: tagRangeData.commits.length,
        compareUrl: tagRangeData.compareUrl
      }
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to generate changelog"
      },
      { status: 500 }
    );
  }
}
