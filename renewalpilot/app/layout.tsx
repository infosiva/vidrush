import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import FloatingChatWrapper from "@/components/FloatingChatWrapper";
import FeedbackWidget from "@/components/FeedbackWidget";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://renewalpilot.app"),
  title: "RenewalPilot — Never Miss a Contract Renewal",
  description:
    "Paste any vendor contract, lease, or insurance policy. RenewalPilot extracts the renewal date and notice period, then tracks it so you never get auto-renewed by surprise.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <FloatingChatWrapper />
        <FeedbackWidget />
      </body>
    </html>
  );
}
