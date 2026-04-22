import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { fetchRepoTags } from "@/lib/github";

export async function GET(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get("gh_token")?.value;
  if (!token) {
    return NextResponse.json({ error: "GitHub is not connected." }, { status: 401 });
  }

  const url = new URL(request.url);
  const repo = url.searchParams.get("repo");

  if (!repo) {
    return NextResponse.json({ error: "Missing repo query parameter." }, { status: 400 });
  }

  try {
    const tags = await fetchRepoTags(token, repo);
    return NextResponse.json({ tags });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch tags.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
