import { NextRequest, NextResponse } from "next/server";
import { getGitHubTokenFromRequest, listRepositoryTags, parseRepositoryInput } from "@/lib/github";

export async function GET(request: NextRequest) {
  const token = getGitHubTokenFromRequest(request);
  if (!token) {
    return NextResponse.json({ error: "GitHub not connected" }, { status: 401 });
  }

  const repository = request.nextUrl.searchParams.get("repo");
  if (!repository) {
    return NextResponse.json({ error: "Missing repo query parameter" }, { status: 400 });
  }

  try {
    const { owner, repo } = parseRepositoryInput(repository);
    const tags = await listRepositoryTags({ authToken: token, owner, repo });

    return NextResponse.json({ tags });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to fetch tags"
      },
      { status: 500 }
    );
  }
}
