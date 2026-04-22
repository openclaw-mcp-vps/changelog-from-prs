import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { fetchPullRequestsAndCommitsBetweenTags } from "@/lib/github";

export async function GET(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get("gh_token")?.value;
  if (!token) {
    return NextResponse.json({ error: "GitHub is not connected." }, { status: 401 });
  }

  const url = new URL(request.url);
  const repo = url.searchParams.get("repo");
  const baseTag = url.searchParams.get("baseTag");
  const headTag = url.searchParams.get("headTag");

  if (!repo || !baseTag || !headTag) {
    return NextResponse.json({ error: "repo, baseTag, and headTag are required." }, { status: 400 });
  }

  try {
    const range = await fetchPullRequestsAndCommitsBetweenTags(token, repo, baseTag, headTag);
    return NextResponse.json(range);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch PR and commit data.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
