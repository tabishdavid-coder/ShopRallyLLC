import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";

import { ShopRallyClerkProvider } from "@/components/providers/clerk-provider";
import { DesignModeDevEntryBar } from "@/components/design-mode/design-mode-dev-entry";
import { DesignModeDock } from "@/components/design-mode/design-mode-dock";
import { shoprallyMetadata } from "@/lib/metadata";
import { isAutopilot3030Shell } from "@/lib/autopilot3030/shell-variant";
import { isDesignModeEnabled } from "@/lib/design-mode-tokens";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = shoprallyMetadata();

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const apShell = isAutopilot3030Shell();
  const designMode = isDesignModeEnabled();

  return (
    <html
      lang="en"
      className={`${inter.variable} ${geistMono.variable} h-full antialiased`}
      data-ap-shell={apShell ? "3030" : undefined}
    >
      <body className="flex h-svh flex-col overflow-hidden">
        <ShopRallyClerkProvider>
          {designMode ? <DesignModeDevEntryBar /> : null}
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
          {designMode ? (
            <Suspense fallback={null}>
              <DesignModeDock />
            </Suspense>
          ) : null}
        </ShopRallyClerkProvider>
      </body>
    </html>
  );
}
