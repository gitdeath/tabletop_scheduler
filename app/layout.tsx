import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

const isHosted = process.env.NEXT_PUBLIC_IS_HOSTED === "true";

export const metadata: Metadata = {
  title: {
    template: '%s | Tabletop Scheduler',
    default: 'Tabletop Scheduler',
  },
  description: "Coordinate D&D and board game sessions without the chaos.",
  robots: isHosted ? "index, follow" : "noindex, nofollow",
  keywords: ["D&D", "Scheduler", "Tabletop", "Board Games", "RPG", "Event Planner"],
  openGraph: isHosted ? {
    type: "website",
    locale: "en_US",
    url: "https://tabletop-scheduler.vercel.app", // Generic fallback, better with env var but acceptable for now
    title: "Tabletop Scheduler",
    description: "Coordinate D&D and board game sessions without the chaos.",
    siteName: "Tabletop Scheduler",
  } : undefined,
  twitter: isHosted ? {
    card: "summary_large_image",
    title: "Tabletop Scheduler",
    description: "Coordinate D&D and board game sessions without the chaos.",
  } : undefined,
};

import { Navbar } from "@/components/Navbar";
import { GoogleAdBar } from "@/components/GoogleAdBar";
import Script from "next/script";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const isHosted = process.env.NEXT_PUBLIC_IS_HOSTED === "true";

  return (
    <html lang="en">
      <body className={inter.className}>
        <Navbar />
        {children}
        {isHosted && <GoogleAdBar />}
      </body>
      {isHosted && (
        <Script
          async
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_ID || "ca-pub-XXXXXXXXXXXXXXXX"}`}
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
      )}
    </html>
  );
}
