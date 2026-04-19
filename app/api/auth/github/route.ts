import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  GITHUB_STATE_COOKIE,
  attachGitHubSessionCookies,
  buildGitHubAuthorizationUrl,
  exchangeGitHubCodeForToken,
  fetchGitHubUser
} from "@/lib/github";

interface OAuthStatePayload {
  state: string;
  nextPath: string;
}

function readStateCookie(raw: string | undefined): OAuthStatePayload | null {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as OAuthStatePayload;
    if (!parsed.state || !parsed.nextPath) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const logout = searchParams.get("logout");

  if (logout === "1") {
    const destination = searchParams.get("next") ?? "/";
    const response = NextResponse.redirect(new URL(destination, request.url));
    response.cookies.delete("cfpr_github_token");
    response.cookies.delete("cfpr_github_user");
    response.cookies.delete(GITHUB_STATE_COOKIE);
    return response;
  }

  if (!code || !state) {
    const nextPath = searchParams.get("next") ?? "/dashboard";
    const generatedState = crypto.randomUUID();
    const authUrl = buildGitHubAuthorizationUrl(request, generatedState);

    const response = NextResponse.redirect(authUrl);
    response.cookies.set(
      GITHUB_STATE_COOKIE,
      JSON.stringify({
        state: generatedState,
        nextPath
      }),
      {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 10
      }
    );

    return response;
  }

  const stateCookie = readStateCookie(request.cookies.get(GITHUB_STATE_COOKIE)?.value);

  if (!stateCookie || stateCookie.state !== state) {
    return NextResponse.redirect(new URL("/dashboard?github=state_error", request.url));
  }

  try {
    const token = await exchangeGitHubCodeForToken(code, request);
    const user = await fetchGitHubUser(token);

    const response = NextResponse.redirect(new URL(stateCookie.nextPath || "/dashboard", request.url));
    response.cookies.delete(GITHUB_STATE_COOKIE);
    attachGitHubSessionCookies({
      response,
      token,
      login: user.login
    });

    return response;
  } catch {
    return NextResponse.redirect(new URL("/dashboard?github=oauth_error", request.url));
  }
}
