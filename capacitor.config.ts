import type { CapacitorConfig } from '@capacitor/cli';

// Remote mode: the app has real server routes (auth callback, /api/transcribe,
// /api/say-check, etc.) that can't be statically exported, so the WebView
// loads the live production deploy instead of bundling static assets. This
// keeps the Android app byte-for-byte the same as the web app.
const PROD_URL = 'https://s2s-ten.vercel.app';

const config: CapacitorConfig = {
  appId: 'com.steppetoscreen.app',
  appName: 'Steppe to Screen',
  webDir: 'public',
  server: {
    url: PROD_URL,
    cleartext: false,
    allowNavigation: [
      's2s-ten.vercel.app',
      '*.vercel.app',
      '*.supabase.co',
    ],
  },
  android: {
    backgroundColor: '#faf6e9',
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
