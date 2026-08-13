import type { CapacitorConfig } from '@capacitor/cli';

// Remote mode: the app has real server routes (auth callback, /api/transcribe,
// /api/say-check, etc.) that can't be statically exported, so the WebView
// loads the live production deploy instead of bundling static assets. This
// keeps the Android app byte-for-byte the same as the web app.
// Note: prod moved off s2s-ten.vercel.app onto the custom domain at some
// point after this was first wired up (www is canonical; apex 308s to it).
const PROD_URL = 'https://www.steppe2screen.com';

const config: CapacitorConfig = {
  appId: 'com.steppetoscreen.app',
  appName: 'Steppe to Screen',
  webDir: 'public',
  server: {
    url: PROD_URL,
    cleartext: false,
    allowNavigation: [
      'steppe2screen.com',
      'www.steppe2screen.com',
      '*.vercel.app',
      '*.supabase.co',
    ],
  },
  android: {
    backgroundColor: '#faf6e9',
  },
  ios: {
    backgroundColor: '#faf6e9',
    // The games draw to the full viewport and several use `min-h-dvh`; letting
    // the WebView own the safe area (rather than iOS insetting the scroll view)
    // keeps the mountain backdrops bleeding to the edges like on the web.
    contentInset: 'never',
    scrollEnabled: true,
  },
  plugins: {
    SplashScreen: {
      // Auto-hides after 1.5s as a safety net (in case the deployed site
      // hasn't shipped NativeShellBridge yet); NativeShellBridge calls
      // SplashScreen.hide() as soon as the app is ready, which fires first
      // once that code is live in production.
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: '#faf6e9',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#faf6e9',
    },
  },
};

export default config;
