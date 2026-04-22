import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { fetchUserRepos } from "@/lib/github";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get("gh_token")?.value;

  if (!token) {
    return NextResponse.json({ error: "GitHub is not connected." }, { status: 401 });
  }

  try {
    const repos = await fetchUserRepos(token);
    return NextResponse.json({ repos });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch repositories.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
