import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AuthProvider } from "./auth";
import { I18nProvider } from "./i18n";
import { ToastProvider } from "./toast";
import { SiteProvider } from "./site";
import { WalletProvider } from "./wallet";
import "./globals.css";
import "./wins.css";

const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://tck666.cc";
export const metadata: Metadata = {
  metadataBase: new URL(site),
  title: {
    default: "TCK Wins — Play. Grow. Belong.",
    template: "%s | TCK Wins",
  },
  description:
    "探索 Web3 游戏、AI 对战与社区任务。TCK Wins — TrustedChain Kaptial。",
  openGraph: {
    title: "TCK Wins",
    siteName: "TCK Wins",
    url: site,
    type: "website",
  },
};
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh">
      <body>
        <I18nProvider>
          <ToastProvider>
            <SiteProvider>
              <WalletProvider>
                <AuthProvider>{children}</AuthProvider>
              </WalletProvider>
            </SiteProvider>
          </ToastProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
