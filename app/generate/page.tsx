import Link from "next/link";
import { cookies } from "next/headers";

import { PricingCards } from "@/components/PricingCards";
import { ReleaseGenerator } from "@/components/ReleaseGenerator";
import { UnlockPurchaseForm } from "@/components/UnlockPurchaseForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getSessionEmail } from "@/lib/database";

export const dynamic = "force-dynamic";

export default async function GeneratePage() {
  const cookieStore = await cookies();
  const githubToken = cookieStore.get("gh_token")?.value;
  const paidSession = cookieStore.get("paid_session")?.value;
  const paidEmail = await getSessionEmail(paidSession);

  if (!githubToken) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center px-6 py-12">
        <Card className="w-full bg-[#101722]">
          <CardHeader>
            <CardTitle>Connect GitHub first</CardTitle>
            <CardDescription>The generator needs OAuth access before it can read tags, PRs, and commits.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/api/auth/github">Connect GitHub</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (!paidEmail) {
    return (
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-12 md:px-10">
        <Card className="bg-[#101722]">
          <CardHeader>
            <CardTitle>Unlock required</CardTitle>
            <CardDescription>
              This tool is behind a paid cookie session. Buy through Stripe, then unlock with the same purchase email.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <UnlockPurchaseForm />
          </CardContent>
        </Card>
        <PricingCards />
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-12 md:px-10">
      <ReleaseGenerator />
    </main>
  );
}
