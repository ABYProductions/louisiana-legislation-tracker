import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import DisclaimerModal from "./components/DisclaimerModal";
import BetaBanner from "./components/BetaBanner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Louisiana Legislation Tracker",
  description: "Track Louisiana state legislation with AI-powered summaries",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
      >
        <BetaBanner />
        <DisclaimerModal />
        {children}
      </body>
    </html>
  );
}