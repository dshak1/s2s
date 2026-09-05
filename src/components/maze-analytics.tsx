"use client";

import Script from "next/script";
import { useIsNativeShell } from "@/lib/native-shell";

// Maze is useful for browser-based workshop research, but the native apps are
// for children and must not load third-party analytics. Capacitor injects the
// platform marker before this component hydrates, so the script never enters
// an iOS or Android WebView.
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

export function MazeAnalytics() {
  const isNative = useIsNativeShell();
  if (isNative) return null;

  return (
    <Script
      id="maze-universal-snippet"
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{ __html: MAZE_SNIPPET }}
    />
  );
}
