"use client";

import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

export type MountainScene =
  | "home"
  | "hub"
  | "sound"
  | "words"
  | "memory"
  | "falling"
  | "places"
  | "bazaar"
  | "patrol"
  | "flashlight"
  | "maker"
  | "story"
  | "yurt"
  | "aitys"
  | "runner";

type SceneConfig = {
  skyTop: string;
  skyMid: string;
  skyBottom: string;
  hillFar: string;
  hillMid: string;
  hillFront: string;
  grass: string;
  grassDeep: string;
  accent: string;
  accentSoft: string;
  cloud: string;
  sun: string;
  yurt: string;
  flower: string;
  speed: string;
};

const SCENES: Record<MountainScene, SceneConfig> = {
  home: {
    skyTop: "#c9f1ff",
    skyMid: "#eaf9ff",
    skyBottom: "#fff4d8",
    hillFar: "#cfeea6",
    hillMid: "#a8dd63",
    hillFront: "#77c846",
    grass: "#8bd452",
    grassDeep: "#43a845",
    accent: "#ff8c57",
    accentSoft: "rgba(255, 159, 106, .24)",
    cloud: "rgba(255, 255, 255, .94)",
    sun: "#ffd75f",
    yurt: "#f8f0df",
    flower: "#ff6fa3",
    speed: "20s",
  },
  hub: {
    skyTop: "#d6f6ff",
    skyMid: "#effbff",
    skyBottom: "#fff1cf",
    hillFar: "#d8efaa",
    hillMid: "#b9e16f",
    hillFront: "#83cf4b",
    grass: "#92da52",
    grassDeep: "#4fb34b",
    accent: "#ff9b44",
    accentSoft: "rgba(255, 178, 90, .26)",
    cloud: "rgba(255, 255, 255, .96)",
    sun: "#ffdf68",
    yurt: "#fff5e3",
    flower: "#f66d95",
    speed: "24s",
  },
  sound: {
    skyTop: "#c7edff",
    skyMid: "#edfaff",
    skyBottom: "#fff5dc",
    hillFar: "#d6eeb2",
    hillMid: "#b9df77",
    hillFront: "#7acb56",
    grass: "#8ed35c",
    grassDeep: "#3fa45b",
    accent: "#2f70d5",
    accentSoft: "rgba(47, 112, 213, .18)",
    cloud: "rgba(255, 255, 255, .95)",
    sun: "#ffdc5d",
    yurt: "#fff3df",
    flower: "#ffcf4a",
    speed: "18s",
  },
  words: {
    skyTop: "#d7f4ff",
    skyMid: "#f3fcff",
    skyBottom: "#fff0d8",
    hillFar: "#d3efad",
    hillMid: "#b2e074",
    hillFront: "#78c954",
    grass: "#86d157",
    grassDeep: "#49aa48",
    accent: "#e94f7f",
    accentSoft: "rgba(233, 79, 127, .18)",
    cloud: "rgba(255, 255, 255, .95)",
    sun: "#ffd768",
    yurt: "#fff0dd",
    flower: "#2f70d5",
    speed: "22s",
  },
  memory: {
    skyTop: "#d9f6ff",
    skyMid: "#f4fcff",
    skyBottom: "#fff4d1",
    hillFar: "#d9efb1",
    hillMid: "#bde47c",
    hillFront: "#8bd05a",
    grass: "#95d95c",
    grassDeep: "#53ad50",
    accent: "#45b874",
    accentSoft: "rgba(69, 184, 116, .2)",
    cloud: "rgba(255, 255, 255, .96)",
    sun: "#ffdf64",
    yurt: "#fff5e4",
    flower: "#ff7aa6",
    speed: "26s",
  },
  falling: {
    skyTop: "#cdeeff",
    skyMid: "#eefaff",
    skyBottom: "#fff2d5",
    hillFar: "#d4edac",
    hillMid: "#afd96d",
    hillFront: "#74c456",
    grass: "#85ce55",
    grassDeep: "#43a456",
    accent: "#4f7fe7",
    accentSoft: "rgba(79, 127, 231, .19)",
    cloud: "rgba(255, 255, 255, .94)",
    sun: "#ffdb60",
    yurt: "#fff2df",
    flower: "#ffb14b",
    speed: "17s",
  },
  places: {
    skyTop: "#d1f5ff",
    skyMid: "#f1fbff",
    skyBottom: "#fff1d5",
    hillFar: "#e3dda0",
    hillMid: "#cbd26f",
    hillFront: "#8fc54b",
    grass: "#95d24d",
    grassDeep: "#67a93d",
    accent: "#e36443",
    accentSoft: "rgba(227, 100, 67, .2)",
    cloud: "rgba(255, 255, 255, .95)",
    sun: "#ffd35c",
    yurt: "#fff0d8",
    flower: "#d43f64",
    speed: "23s",
  },
  bazaar: {
    skyTop: "#d8f5ff",
    skyMid: "#f6fcff",
    skyBottom: "#ffeecb",
    hillFar: "#eadb9a",
    hillMid: "#d4c76e",
    hillFront: "#92c755",
    grass: "#9bd456",
    grassDeep: "#6aa63d",
    accent: "#ff914d",
    accentSoft: "rgba(255, 145, 77, .24)",
    cloud: "rgba(255, 255, 255, .95)",
    sun: "#ffda62",
    yurt: "#fff0d7",
    flower: "#d84871",
    speed: "19s",
  },
  patrol: {
    skyTop: "#d5f6ff",
    skyMid: "#f3fbff",
    skyBottom: "#f8f7e6",
    hillFar: "#d8eab4",
    hillMid: "#b6d783",
    hillFront: "#76bd67",
    grass: "#89cc64",
    grassDeep: "#4f9c54",
    accent: "#6b7fa4",
    accentSoft: "rgba(107, 127, 164, .19)",
    cloud: "rgba(255, 255, 255, .96)",
    sun: "#ffdd67",
    yurt: "#fff5e5",
    flower: "#ffcf4c",
    speed: "27s",
  },
  flashlight: {
    skyTop: "#bfdfff",
    skyMid: "#e4f4ff",
    skyBottom: "#fff3d8",
    hillFar: "#cadc9a",
    hillMid: "#aeca71",
    hillFront: "#67b85e",
    grass: "#77c45b",
    grassDeep: "#3d8f55",
    accent: "#1e4d8c",
    accentSoft: "rgba(30, 77, 140, .18)",
    cloud: "rgba(255, 255, 255, .94)",
    sun: "#ffe071",
    yurt: "#fff2df",
    flower: "#ff9a5d",
    speed: "28s",
  },
  maker: {
    skyTop: "#d6f4ff",
    skyMid: "#f4fcff",
    skyBottom: "#fff0db",
    hillFar: "#dfebb1",
    hillMid: "#c8df78",
    hillFront: "#88c75a",
    grass: "#96d15a",
    grassDeep: "#56a54c",
    accent: "#ff6f9f",
    accentSoft: "rgba(255, 111, 159, .2)",
    cloud: "rgba(255, 255, 255, .96)",
    sun: "#ffd96b",
    yurt: "#fff3e4",
    flower: "#ff9b44",
    speed: "18s",
  },
  story: {
    skyTop: "#d4efff",
    skyMid: "#f1fbff",
    skyBottom: "#fff2dc",
    hillFar: "#d8ecaa",
    hillMid: "#bddb78",
    hillFront: "#7fc462",
    grass: "#8fd15d",
    grassDeep: "#4ca35a",
    accent: "#8f6de8",
    accentSoft: "rgba(143, 109, 232, .18)",
    cloud: "rgba(255, 255, 255, .96)",
    sun: "#ffdc68",
    yurt: "#fff4e2",
    flower: "#ff7aa6",
    speed: "21s",
  },
  yurt: {
    skyTop: "#d9f6ff",
    skyMid: "#f5fcff",
    skyBottom: "#fff3d4",
    hillFar: "#daedaa",
    hillMid: "#bddf72",
    hillFront: "#83cb58",
    grass: "#91d659",
    grassDeep: "#48a84e",
    accent: "#d43f64",
    accentSoft: "rgba(212, 63, 100, .18)",
    cloud: "rgba(255, 255, 255, .96)",
    sun: "#ffdd64",
    yurt: "#fff2dd",
    flower: "#2f70d5",
    speed: "23s",
  },
  aitys: {
    skyTop: "#d6f1ff",
    skyMid: "#f2fbff",
    skyBottom: "#fff0d4",
    hillFar: "#e2dea1",
    hillMid: "#cfd073",
    hillFront: "#86c455",
    grass: "#93d154",
    grassDeep: "#59a444",
    accent: "#e75f50",
    accentSoft: "rgba(231, 95, 80, .2)",
    cloud: "rgba(255, 255, 255, .95)",
    sun: "#ffd664",
    yurt: "#fff1de",
    flower: "#ffcf4a",
    speed: "22s",
  },
  runner: {
    skyTop: "#c9eaff",
    skyMid: "#eef8ff",
    skyBottom: "#fff1cf",
    hillFar: "#d7edaa",
    hillMid: "#b3df72",
    hillFront: "#78c854",
    grass: "#8ad452",
    grassDeep: "#46a84a",
    accent: "#e35f4c",
    accentSoft: "rgba(227, 95, 76, .2)",
    cloud: "rgba(255, 255, 255, .95)",
    sun: "#ffd75f",
    yurt: "#fff2df",
    flower: "#ffb14b",
    speed: "16s",
  },
};

const GAME_SCENES: Record<string, MountainScene> = {
  "sound-it-out": "sound",
  learn: "sound",
  "sozdik-match": "words",
  "memory-match": "memory",
  "falling-sozder": "falling",
  "where-kz": "places",
  bazaar: "bazaar",
  "snow-leopard": "patrol",
  "steppe-sprint": "places",
  "jaryq-hunter": "flashlight",
  "tanba-studio": "maker",
  "story-maker": "story",
  aitys: "aitys",
  "say-and-shift": "runner",
};

export function sceneForGameSlug(slug: string): MountainScene {
  return GAME_SCENES[slug] ?? "hub";
}

export function sceneForPath(pathname: string): MountainScene {
  const match = Object.entries(GAME_SCENES).find(([gameSlug]) => pathname.includes(`/play/${gameSlug}`));
  return match?.[1] ?? "hub";
}

export function MountainBackdrop({
  scene = "hub",
  className,
}: {
  scene?: MountainScene;
  className?: string;
}) {
  const config = SCENES[scene];
  const style = {
    "--scene-sky-top": config.skyTop,
    "--scene-sky-mid": config.skyMid,
    "--scene-sky-bottom": config.skyBottom,
    "--scene-hill-far": config.hillFar,
    "--scene-hill-mid": config.hillMid,
    "--scene-hill-front": config.hillFront,
    "--scene-grass": config.grass,
    "--scene-grass-deep": config.grassDeep,
    "--scene-accent": config.accent,
    "--scene-accent-soft": config.accentSoft,
    "--scene-cloud": config.cloud,
    "--scene-sun": config.sun,
    "--scene-yurt": config.yurt,
    "--scene-flower": config.flower,
    "--mountain-speed": config.speed,
  } as CSSProperties;

  return (
    <div className={cn("mountain-backdrop", className)} style={style} aria-hidden="true">
      <svg className="scene-sun" viewBox="0 0 120 120">
        <g stroke="var(--scene-sun)" strokeLinecap="round" strokeWidth="7">
          <path d="M60 8v14" />
          <path d="M60 98v14" />
          <path d="M8 60h14" />
          <path d="M98 60h14" />
          <path d="M23 23l10 10" />
          <path d="M87 87l10 10" />
          <path d="M97 23l-10 10" />
          <path d="M33 87l-10 10" />
        </g>
        <circle cx="60" cy="60" r="32" fill="var(--scene-sun)" />
        <path d="M46 57c6 5 22 5 28 0" fill="none" stroke="#b9781d" strokeLinecap="round" strokeWidth="4" opacity=".5" />
      </svg>

      <div className="mountain-clouds">
        <span />
        <span />
        <span />
      </div>

      <svg className="scene-dotted-path" viewBox="0 0 1200 360" preserveAspectRatio="none">
        <path d="M40 280 C230 120 345 290 520 165 S805 70 1160 230" fill="none" stroke="var(--scene-accent)" strokeDasharray="6 20" strokeLinecap="round" strokeWidth="9" />
      </svg>

      <svg className="mountain-range mountain-range-far" viewBox="0 0 1200 420" preserveAspectRatio="none">
        <path d="M0 248 C115 190 210 200 315 246 C450 304 542 168 688 224 C805 268 910 170 1028 216 C1110 248 1160 236 1200 222 V420 H0 Z" fill="var(--scene-hill-far)" />
      </svg>

      <svg className="mountain-range mountain-range-mid" viewBox="0 0 1200 420" preserveAspectRatio="none">
        <path d="M0 292 C135 235 234 260 350 300 C500 352 594 205 748 274 C880 333 976 230 1100 255 C1145 265 1180 260 1200 252 V420 H0 Z" fill="var(--scene-hill-mid)" />
      </svg>

      <svg className="scene-yurt" viewBox="0 0 220 150">
        <path d="M38 116V72c0-35 31-62 72-62s72 27 72 62v44Z" fill="var(--scene-yurt)" stroke="#244e84" strokeWidth="6" />
        <path d="M29 76c31-24 57-36 81-36s50 12 81 36" fill="none" stroke="#244e84" strokeLinecap="round" strokeWidth="6" />
        <path d="M110 42v74" stroke="#244e84" strokeWidth="5" />
        <path d="M73 118V82h74v36" fill="#fffbef" stroke="#244e84" strokeWidth="5" />
        <path d="M74 91h73" stroke="var(--scene-accent)" strokeWidth="5" />
        <path d="M88 103h44" stroke="var(--scene-accent)" strokeLinecap="round" strokeWidth="5" />
        <path d="M18 119h184" stroke="#244e84" strokeLinecap="round" strokeWidth="7" />
      </svg>

      <svg className="scene-cat" viewBox="0 0 180 190">
        <path d="M45 88c-24 17-23 58-1 77 25 22 78 20 97-5 17-22 8-60-15-73-20-12-59-13-81 1Z" fill="#f7f2e7" stroke="#244e84" strokeWidth="6" />
        <path d="M52 79 37 42l42 22M116 64l40-22-15 38" fill="#f7f2e7" stroke="#244e84" strokeLinejoin="round" strokeWidth="6" />
        <path d="M55 79c15-13 55-15 78 0 20 13 28 40 21 63-8 25-31 40-63 40-36 0-63-19-69-45-5-23 7-45 33-58Z" fill="#fffdf5" stroke="#244e84" strokeWidth="6" />
        <circle cx="72" cy="111" r="6" fill="#244e84" />
        <circle cx="116" cy="111" r="6" fill="#244e84" />
        <path d="M88 126c4 4 9 4 13 0M94 119l-7 6h14Z" fill="#ff8f9f" stroke="#244e84" strokeLinejoin="round" strokeWidth="3" />
        <path d="M41 124H19M44 137H22M139 124h22M137 137h21" stroke="#244e84" strokeLinecap="round" strokeWidth="4" />
        <path d="M61 163c-9 14-27 14-34 2M124 163c11 12 28 11 34-4" fill="none" stroke="#244e84" strokeLinecap="round" strokeWidth="6" />
        <path d="M71 54c15-6 33-6 49 0" stroke="var(--scene-accent)" strokeLinecap="round" strokeWidth="7" />
      </svg>

      <svg className="mountain-range mountain-range-front" viewBox="0 0 1200 420" preserveAspectRatio="none">
        <path d="M0 314 C130 274 255 292 380 326 C520 364 665 295 800 330 C936 365 1058 306 1200 318 V420 H0 Z" fill="var(--scene-hill-front)" />
        <path d="M0 356 C160 323 310 354 470 364 C640 376 780 328 950 354 C1055 370 1135 361 1200 352 V420 H0 Z" fill="var(--scene-grass)" />
        <path d="M0 391 C190 363 335 397 510 389 C695 381 820 364 1008 386 C1095 397 1158 393 1200 384 V420 H0 Z" fill="var(--scene-grass-deep)" opacity=".72" />
      </svg>

      <div className="mountain-ornament" />
    </div>
  );
}
