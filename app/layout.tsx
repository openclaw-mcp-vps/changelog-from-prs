import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { IBM_Plex_Sans, Space_Grotesk } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-heading",
  display: "swap"
});

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
  display: "swap"
});

export const metadata: Metadata = {
  metadataBase: new URL("https://changelog-from-prs.com"),
  title: "Changelog from PRs",
  description:
    "Generate polished, customer-facing release notes from any GitHub history. Connect a repo, pick tags, and ship changelogs in minutes.",
  keywords: [
    "release notes",
    "changelog generator",
    "github pr changelog",
    "open source maintenance",
    "release tooling"
  ],
  openGraph: {
    title: "Changelog from PRs",
    description:
      "Turn messy PR history into clean release notes grouped by Features, Fixes, and Breaking Changes.",
    type: "website",
    url: "https://changelog-from-prs.com",
    siteName: "Changelog from PRs"
  },
  twitter: {
    card: "summary_large_image",
    title: "Changelog from PRs",
    description:
      "Paste a repo and tag range, then generate release notes your users can actually understand."
  },
  alternates: {
    canonical: "/"
  }
};

export const viewport: Viewport = {
  themeColor: "#0d1117",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${spaceGrotesk.variable} ${ibmPlexSans.variable} antialiased`}>
        <Script src="https://app.lemonsqueezy.com/js/lemon.js" strategy="afterInteractive" />
        {children}
      </body>
    </html>
  );
}
