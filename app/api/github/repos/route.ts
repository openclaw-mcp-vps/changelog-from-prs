import { NextRequest, NextResponse } from "next/server";
import { getGitHubTokenFromRequest, listAuthenticatedRepos } from "@/lib/github";

export async function GET(request: NextRequest) {
  const token = getGitHubTokenFromRequest(request);

  if (!token) {
    return NextResponse.json({ error: "GitHub not connected" }, { status: 401 });
  }

  try {
    const repositories = await listAuthenticatedRepos(token);
    return NextResponse.json({ repositories });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to fetch repositories"
      },
      { status: 500 }
    );
  }
}
