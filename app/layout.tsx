import type { Metadata } from "next";
import { Space_Grotesk, JetBrains_Mono } from "next/font/google";

import "@/app/globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk"
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono"
});

export const metadata: Metadata = {
  metadataBase: new URL("https://changelog-from-prs.app"),
  title: "Changelog from PRs | Release notes from any Git history",
  description:
    "Paste a GitHub repo and tag range to generate user-facing release notes grouped by Features, Fixes, and Breaking Changes.",
  keywords: ["release notes", "github", "changelog", "open source", "automation"],
  openGraph: {
    title: "Changelog from PRs",
    description:
      "Generate release notes for humans from any GitHub tag range. No PR title conventions required.",
    url: "https://changelog-from-prs.app",
    siteName: "Changelog from PRs",
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "Changelog from PRs",
    description: "Generate release notes for humans from tag ranges, not commit conventions."
  },
  robots: {
    index: true,
    follow: true
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${spaceGrotesk.variable} ${jetBrainsMono.variable} font-[family-name:var(--font-space-grotesk)] antialiased`}>
        {children}
      </body>
    </html>
  );
}
