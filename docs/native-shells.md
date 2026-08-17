# Native shells (Android + iOS)

Both store apps are Capacitor WebView wrappers around the **live production
site**, not a bundled copy of it. `capacitor.config.ts` sets
`server.url = https://www.steppe2screen.com`, so a native release ships no web
assets and needs no rebuild when the site changes — deploy to Vercel and both
apps are updated. `webDir: 'public'` exists only because the CLI requires it.

Why remote instead of a static export: the app has real server routes the games
depend on (`/auth/callback`, `/api/transcribe`, `/api/say-check`, the server
actions behind the admin tools). A static export drops all of them.

The tradeoff is that neither app works offline, even though the web app itself
is localStorage-first. If a workshop needs offline play, install the PWA
instead — that is what it is for.

## Layout

| Path | What it is |
|---|---|
| `capacitor.config.ts` | Shared config: app id, remote URL, allowed hosts, splash/status bar, per-platform bits |
| `android/` | Generated Gradle project (`com.steppetoscreen.app`) |
| `ios/` | Generated Xcode project, Swift Package Manager for plugins |
| `assets/` | `icon.svg` + `splash.svg` — the sources every launcher icon and splash screen is generated from |
| `src/components/native-shell-bridge.tsx` | The only app code that knows it is inside a shell |

## Commands

```bash
pnpm cap:sync        # copy config + plugins into both native projects
pnpm cap:ios         # sync, then open Xcode
pnpm cap:android     # sync, then open Android Studio
pnpm cap:assets      # regenerate icons and splash screens from assets/*.svg
```

Run `pnpm cap:sync` after adding or upgrading any `@capacitor/*` plugin. iOS
plugins resolve through Swift Package Manager (Capacitor 8), so **CocoaPods is
not required** — there is no `Podfile` and no `pod install` step.

## iOS specifics

- **Signing.** The generated project has no team set. Open `ios/App/App.xcodeproj`,
  select the `App` target, and pick a team under Signing & Capabilities before
  the first device build. That setting is local to whoever builds it.
- **Permissions.** `Info.plist` declares microphone (Say & Shift, Sound It Out),
  photo library, and camera usage strings. iOS kills the app instead of
  prompting if a usage string is missing, so any new native capability needs its
  string added there first.
- **Portrait only on iPhone**, matching `android:screenOrientation="portrait"`.
  Rotating mid-run resizes the canvas games out from under the player. iPad
  keeps all orientations — a propped-up tablet is a normal way to play at a
  workshop table.
- **`contentInset: 'never'`** so the WebView owns the safe area and the mountain
  backdrops bleed to the edges, the same as on the web.

## Status bar

`NativeShellBridge` sends `StatusBar.setStyle({ style: Style.Light })`. The
Capacitor enum is named after the *background* it complements, so `Light` means
dark icons — which is what every screen needs, since they all sit on cream or
pale sky. `setBackgroundColor` is Android-only and rejects harmlessly on iOS,
where the status bar floats over the page.

## Releasing

Android signing config and the keystore live under `android/keystore/` (not in
git).

### Apple identifiers (registered)

| Field | Value |
|---|---|
| Team ID (App ID Prefix) | `28GZGDTHQX` |
| Bundle ID | `com.steppetoscreen.app` (explicit) |
| Platforms | iOS, iPadOS, macOS, tvOS, watchOS, visionOS |
| Description | default |

These live here, not in `.env` — they are account/project constants already mirrored
in `capacitor.config.ts` (`appId`) and `ios/App/App.xcodeproj`
(`PRODUCT_BUNDLE_IDENTIFIER`). Pick the matching Team in Xcode → Signing &
Capabilities when archiving.

**SKU** (App Store Connect → New App): internal inventory string only. Not shown
to users, not checked by review. Any unique value is fine, e.g. `s2s-ios`.
