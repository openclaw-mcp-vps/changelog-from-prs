import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { getSessionEmail, incrementUsage } from "@/lib/database";
import { fetchPullRequestsAndCommitsBetweenTags } from "@/lib/github";
import { generateReleaseNotes } from "@/lib/openai";

type GenerateRequest = {
  repoFullName?: string;
  baseTag?: string;
  headTag?: string;
};

export async function POST(request: Request) {
  const cookieStore = await cookies();

  const paidSession = cookieStore.get("paid_session")?.value;
  const paidEmail = await getSessionEmail(paidSession);
  if (!paidEmail) {
    return NextResponse.json(
      {
        error: "Paid access required. Complete checkout and unlock using your purchase email."
      },
      { status: 402 }
    );
  }

  const githubToken = cookieStore.get("gh_token")?.value;
  if (!githubToken) {
    return NextResponse.json({ error: "GitHub is not connected." }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as GenerateRequest;
  if (!body.repoFullName || !body.baseTag || !body.headTag) {
    return NextResponse.json({ error: "repoFullName, baseTag, and headTag are required." }, { status: 400 });
  }

  if (body.baseTag === body.headTag) {
    return NextResponse.json({ error: "Choose two different tags." }, { status: 400 });
  }

  try {
    const rangeData = await fetchPullRequestsAndCommitsBetweenTags(
      githubToken,
      body.repoFullName,
      body.baseTag,
      body.headTag
    );

    const markdown = await generateReleaseNotes(rangeData);
    const usage = await incrementUsage(paidEmail);

    return NextResponse.json({
      markdown,
      stats: {
        totalPullRequests: rangeData.totalPullRequests,
        totalDirectCommits: rangeData.commits.length
      },
      usage
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate release notes.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
