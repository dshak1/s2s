import type { Metadata, Viewport } from "next";
import { Nunito, Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { Providers } from "./providers";

// Maze universal snippet — connects the Maze research tool and embeds live
// surveys. Loaded with `beforeInteractive` so Next.js injects it into <head>
// as early as possible, per Maze install docs.
const MAZE_SNIPPET = `(function (m, a, z, e) {
  var s, t, u, v;
  try {
    t = m.sessionStorage.getItem('maze-us');
  } catch (err) {}

  if (!t) {
    t = new Date().getTime();
    try {
      m.sessionStorage.setItem('maze-us', t);
    } catch (err) {}
  }

  u = document.currentScript || (function () {
    var w = document.getElementsByTagName('script');
    return w[w.length - 1];
  })();
  v = u && u.nonce;

  s = a.createElement('script');
  s.src = z + '?apiKey=' + e;
  s.async = true;
  if (v) s.setAttribute('nonce', v);
  a.getElementsByTagName('head')[0].appendChild(s);
  m.mazeUniversalSnippetApiKey = e;
})(window, document, 'https://snippet.maze.co/maze-universal-loader.js', '5bbb3393-47cc-4903-8c55-317c62ea5172');`;

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
        {/* Next hoists beforeInteractive scripts into <head>; placing it in body
            keeps the JSX valid HTML (script can't be a direct child of html). */}
        <Script
          id="maze-universal-snippet"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: MAZE_SNIPPET }}
        />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
