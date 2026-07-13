import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Script from "next/script";
import FloatingChatWrapper from "@/components/FloatingChatWrapper"
import FeedbackWidget from "@/components/FeedbackWidget"

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://switchboard-ai.vercel.app"),
  title: "ReplyDesk — AI Support That Resolves, Not Just Routes",
  description: "ReplyDesk resolves support tickets end-to-end — no human queue, no per-seat pricing. Autonomous AI that closes tickets, not just triages them.",
  keywords: ["AI customer support", "virtual receptionist", "automated helpdesk", "business automation"],
  openGraph: {
    title: "ReplyDesk — AI Support That Resolves, Not Just Routes",
    description: "Autonomous AI that closes support tickets end-to-end, no human queue.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full dark">
      <head>
        <meta name="google-adsense-account" content="ca-pub-4237294630161176" />
        <Script
          id="structured-data"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              "name": "ReplyDesk",
              "description": "AI-powered customer support and reception automation",
              "applicationCategory": "BusinessApplication",
              "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "USD"
              }
            })
          }}
        />
      </head>
      <body className={`${inter.className} bg-gray-950 text-gray-100 min-h-full`}>
        {children}
        <FloatingChatWrapper />
        <FeedbackWidget siteName="ReplyDesk" accentColor="#6366f1" accentColor2="#4f46e5" position="left" />
        <Script defer data-site="switchboard-ai.vercel.app" src="http://31.97.56.148:3098/t.js" strategy="afterInteractive" />
      </body>
    </html>
  );
}
