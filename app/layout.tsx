import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import BetaBanner from "./components/BetaBanner";
import DisclaimerModal from "./components/DisclaimerModal";
import EmailOptInModal from "./components/EmailOptInModal";
import AuthProvider from "@/app/components/AuthProvider";
import WatchlistProvider from "@/app/components/WatchlistProvider";
import ErrorBoundary from "@/app/components/ErrorBoundary";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://sessionsource.net'),
  title: "SessionSource - Louisiana",
  description: "Track Louisiana state legislation with AI-powered summaries",
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <BetaBanner />
        <a href="#main-content" className="skip-to-content">
          Skip to main content
        </a>
        <AuthProvider>
          <WatchlistProvider>
            <ErrorBoundary>
              <DisclaimerModal />
              <Suspense fallback={null}>
                <EmailOptInModal />
              </Suspense>
              <div id="main-content">
                {children}
              </div>
            </ErrorBoundary>
          </WatchlistProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
