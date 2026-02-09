import type { Metadata } from "next";
import "./globals.css";
import Header from "./components/Header";
import Footer from "./components/Footer";
import { Analytics } from '@vercel/analytics/react';

export const metadata: Metadata = {
  title: "Louisiana Legislation Tracker | AI-Powered Bill Tracking",
  description: "Track Louisiana legislation with AI-powered summaries. Stay informed about bills that matter to you with plain-language explanations and real-time updates.",
  keywords: ["Louisiana", "legislation", "bills", "tracking", "legislature", "law", "politics"],
  openGraph: {
    title: "Louisiana Legislation Tracker",
    description: "Track Louisiana legislation with AI-powered summaries.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 pt-16">
          {children}
        </div>
        <Analytics />
        <Footer />
      </body>
    </html>
  );
}
