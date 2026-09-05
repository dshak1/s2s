import type { Metadata, Viewport } from "next";
import { Nunito, Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { MazeAnalytics } from "@/components/maze-analytics";

const nunito = Nunito({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800", "900"],
  variable: "--font-nunito",
});
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Steppe to Screen",
  description: "Learn Kazakh language and culture, games, art, and the steppe.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Steppe2Screen",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#1e4d8c",
  width: "device-width",
  initialScale: 1,
  // Capacitor's Android shell draws the WebView edge-to-edge (behind the
  // gesture/nav bar), so without this the safe-area env() vars below stay
  // zeroed and the bottom of every page sits under the nav bar — you have
  // to scroll to see content that's already "on screen" but hidden behind it.
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${nunito.variable} ${inter.variable}`}>
      <body className="min-h-dvh antialiased">
        <MazeAnalytics />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
