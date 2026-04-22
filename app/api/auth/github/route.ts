import crypto from "node:crypto";

import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { fetchAuthenticatedGitHubUser } from "@/lib/github";

function appBaseUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

function oauthRedirectUri() {
  return `${appBaseUrl()}/api/auth/github`;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const action = url.searchParams.get("action");
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");

  const cookieStore = await cookies();

  if (action === "logout") {
    cookieStore.delete("gh_token");
    cookieStore.delete("gh_login");
    cookieStore.delete("gh_oauth_state");
    return NextResponse.redirect(new URL("/dashboard", appBaseUrl()));
  }

  if (oauthError) {
    return NextResponse.redirect(new URL(`/dashboard?error=${encodeURIComponent(oauthError)}`, appBaseUrl()));
  }

  const githubClientId = process.env.GITHUB_CLIENT_ID;
  const githubClientSecret = process.env.GITHUB_CLIENT_SECRET;

  if (!githubClientId || !githubClientSecret) {
    return NextResponse.json(
      {
        error: "Missing GITHUB_CLIENT_ID or GITHUB_CLIENT_SECRET environment variables."
      },
      { status: 500 }
    );
  }

  if (!code) {
    const generatedState = crypto.randomBytes(24).toString("hex");
    cookieStore.set("gh_oauth_state", generatedState, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 10,
      path: "/"
    });

    const authorizeUrl = new URL("https://github.com/login/oauth/authorize");
    authorizeUrl.searchParams.set("client_id", githubClientId);
    authorizeUrl.searchParams.set("redirect_uri", oauthRedirectUri());
    authorizeUrl.searchParams.set("scope", "repo read:user");
    authorizeUrl.searchParams.set("state", generatedState);

    return NextResponse.redirect(authorizeUrl);
  }

  const expectedState = cookieStore.get("gh_oauth_state")?.value;
  if (!state || !expectedState || state !== expectedState) {
    return NextResponse.json({ error: "Invalid OAuth state. Please retry GitHub login." }, { status: 400 });
  }

  const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      client_id: githubClientId,
      client_secret: githubClientSecret,
      code,
      redirect_uri: oauthRedirectUri()
    })
  });

  if (!tokenResponse.ok) {
    return NextResponse.json({ error: "Failed to exchange GitHub OAuth code." }, { status: 502 });
  }

  const tokenPayload = (await tokenResponse.json()) as {
    access_token?: string;
    error?: string;
    error_description?: string;
  };

  if (!tokenPayload.access_token) {
    return NextResponse.json(
      {
        error: tokenPayload.error_description ?? tokenPayload.error ?? "GitHub did not return an access token."
      },
      { status: 400 }
    );
  }

  const user = await fetchAuthenticatedGitHubUser(tokenPayload.access_token);

  cookieStore.set("gh_token", tokenPayload.access_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    path: "/"
  });

  cookieStore.set("gh_login", user.login, {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    path: "/"
  });

  cookieStore.delete("gh_oauth_state");

  return NextResponse.redirect(new URL("/dashboard", appBaseUrl()));
}
