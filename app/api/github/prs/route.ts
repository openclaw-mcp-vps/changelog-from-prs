import { NextRequest, NextResponse } from "next/server";
import { getGitHubTokenFromRequest, getTagRangeData, parseRepositoryInput } from "@/lib/github";

export async function GET(request: NextRequest) {
  const token = getGitHubTokenFromRequest(request);
  if (!token) {
    return NextResponse.json({ error: "GitHub not connected" }, { status: 401 });
  }

  const repository = request.nextUrl.searchParams.get("repo");
  const fromTag = request.nextUrl.searchParams.get("fromTag");
  const toTag = request.nextUrl.searchParams.get("toTag");

  if (!repository || !fromTag || !toTag) {
    return NextResponse.json(
      {
        error: "repo, fromTag and toTag are required"
      },
      { status: 400 }
    );
  }

  try {
    const { owner, repo } = parseRepositoryInput(repository);
    const data = await getTagRangeData({ authToken: token, owner, repo, fromTag, toTag });

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to fetch PR and commit data"
      },
      { status: 500 }
    );
  }
}
