import type { Metadata } from "next";
import "./globals.css";
import DisclaimerModal from "./components/DisclaimerModal";
import AuthProvider from "@/app/components/AuthProvider";
import WatchlistProvider from "@/app/components/WatchlistProvider";
import ErrorBoundary from "@/app/components/ErrorBoundary";

export const metadata: Metadata = {
  title: "SessionSource - Louisiana",
  description: "Track Louisiana state legislation with AI-powered summaries",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <a href="#main-content" className="skip-to-content">
          Skip to main content
        </a>
        <AuthProvider>
          <WatchlistProvider>
            <ErrorBoundary>
              <DisclaimerModal />
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
