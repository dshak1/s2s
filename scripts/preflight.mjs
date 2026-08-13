#!/usr/bin/env node
// Pre-deploy checks. Run `pnpm preflight` before pushing to the prod branch.
//
// Every check here exists because the failure it catches actually shipped to
// production once. The theme is the same each time: what runs locally is the
// *working tree*, but what deploys is the *committed tree*, and those drifted
// far enough apart that prod ran a mix of old and new code.

import { execSync, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { readFile, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const sh = (cmd, opts = {}) => execSync(cmd, { cwd: ROOT, encoding: "utf8", ...opts }).trim();

const results = [];
function record(name, failures, hint) {
  results.push({ name, failures, hint });
  const label = failures.length === 0 ? "\x1b[32mPASS\x1b[0m" : "\x1b[31mFAIL\x1b[0m";
  console.log(`${label}  ${name}`);
  for (const f of failures.slice(0, 20)) console.log(`        ${f}`);
  if (failures.length > 20) console.log(`        ...and ${failures.length - 20} more`);
  if (failures.length && hint) console.log(`        \x1b[2m${hint}\x1b[0m`);
}

// 1. Nothing tracked left uncommitted.
// The big one. Prod shipped a games.ts from before the v2 rework because the
// file was modified but never staged, so the hub rendered the old game list.
function checkNothingUncommitted() {
  const dirty = sh("git status --porcelain")
    .split("\n")
    .filter(Boolean)
    .filter((line) => !line.startsWith("??"))
    .map((line) => line.trim());
  record("no uncommitted tracked changes", dirty, "git add -u && git commit");
}

// 2. Untracked files that source already imports.
// Catches the other direction: a brand-new file that works locally because it
// sits in the working tree, but was never `git add`ed, so a clean checkout
// cannot resolve the import.
async function checkUntrackedButReferenced() {
  const untracked = sh("git ls-files --others --exclude-standard")
    .split("\n")
    .filter((f) => /^src\/.*\.(ts|tsx)$/.test(f));
  if (untracked.length === 0) return record("no untracked files referenced by source", []);

  const tracked = sh("git ls-files 'src/**/*.ts' 'src/**/*.tsx'").split("\n").filter(Boolean);
  const bodies = await Promise.all(
    tracked.map(async (f) => ({ f, text: await readFile(join(ROOT, f), "utf8") })),
  );

  const failures = [];
  for (const file of untracked) {
    // src/lib/foo.ts -> "@/lib/foo"
    const alias = "@/" + file.replace(/^src\//, "").replace(/\.(ts|tsx)$/, "");
    const importer = bodies.find(({ text }) => text.includes(`"${alias}"`) || text.includes(`'${alias}'`));
    if (importer) failures.push(`${file} is imported by ${importer.f} but is not committed`);
  }
  record("no untracked files referenced by source", failures, "git add the listed files");
}

// 3. Every /public asset referenced by source is committed.
// Same drift as the code case, but silent: an uncommitted mp3 or jpg still
// plays locally and 404s in production, with no build or type error. Twenty
// vocab clips and four place photos shipped this way.
async function checkReferencedAssetsCommitted() {
  const files = sh("git ls-files 'src/**/*.ts' 'src/**/*.tsx'").split("\n").filter(Boolean);
  const refs = new Set();
  for (const f of files) {
    const text = await readFile(join(ROOT, f), "utf8");
    for (const m of text.matchAll(/["'`](\/(?:audio|img)\/[a-zA-Z0-9/._-]+\.(?:mp3|jpg|jpeg|png|webp|avif|svg))["'`]/g)) {
      refs.add(m[1]);
    }
  }

  // Vocab clips are addressed as `/audio/vocab/${slug}.mp3`, so the literal
  // path never appears in source. Expand the template over the real slug list.
  const vocabSrc = await readFile(join(ROOT, "src/content/vocab.ts"), "utf8");
  for (const m of vocabSrc.matchAll(/slug:\s*"([a-z0-9-]+)"/g)) {
    refs.add(`/audio/vocab/${m[1]}.mp3`);
  }

  const tracked = new Set(sh("git ls-files public").split("\n").filter(Boolean));
  const failures = [];
  for (const ref of refs) {
    const path = `public${ref}`;
    if (tracked.has(path)) continue;
    failures.push(existsSync(join(ROOT, path)) ? `${ref} exists but is not committed` : `${ref} is referenced but missing`);
  }
  record("referenced public assets are committed", failures, "git add the listed files under public/");
}

// 4. Every internal link points at a route that exists.
// /welcome 404'd in production for every first-time visitor: FirstRunGate
// redirected to it and the page component had never been committed. Nothing
// imports a route file as a module, so tsc cannot see this class of bug.
async function checkRoutesResolve() {
  const files = sh("git ls-files 'src/**/*.ts' 'src/**/*.tsx'").split("\n").filter(Boolean);
  const targets = new Set();
  for (const f of files) {
    const text = await readFile(join(ROOT, f), "utf8");
    // Only static, non-template internal paths; dynamic segments are unverifiable here.
    for (const m of text.matchAll(/(?:href|router\.(?:push|replace))=?\(?\s*"(\/[a-zA-Z0-9/_-]*)"/g)) {
      targets.add(m[1]);
    }
  }

  const appDir = join(ROOT, "src/app");
  const routeExists = (route) => {
    const base = route === "/" ? appDir : join(appDir, route);
    if (["page.tsx", "page.ts", "route.ts", "route.tsx"].some((f) => existsSync(join(base, f)))) return true;
    // A dynamic segment ([id], [code], ...) at this level can serve the path.
    const parent = resolve(base, "..");
    if (!existsSync(parent)) return false;
    return false;
  };

  const failures = [...targets]
    .filter((r) => !routeExists(r))
    .map((r) => `${r} is linked but has no page.tsx/route.ts under src/app`);
  record("every internal link resolves to a route", failures, "commit the missing page, or fix the link");
}

// 5. The committed tree typechecks on its own.
// The check that would have caught the most damage. Running tsc in the working
// tree passes even when required files were never committed, because they are
// sitting right there on disk. This exports HEAD to a temp dir, symlinks the
// existing node_modules, and typechecks *that*.
function checkCommittedTreeTypechecks() {
  if (!existsSync(join(ROOT, "node_modules"))) {
    return record("committed tree typechecks", ["node_modules missing; run pnpm install"], null);
  }
  const dir = mkdtempSync(join(tmpdir(), "s2s-preflight-"));
  try {
    execSync(`git archive HEAD | tar -x -C ${dir}`, { cwd: ROOT });
    execSync(`ln -s ${join(ROOT, "node_modules")} ${join(dir, "node_modules")}`);
    const out = spawnSync(join(ROOT, "node_modules/.bin/tsc"), ["--noEmit", "-p", "."], {
      cwd: dir,
      encoding: "utf8",
    });
    const failures =
      out.status === 0 ? [] : (out.stdout || out.stderr || "tsc failed").split("\n").filter(Boolean);
    record("committed tree typechecks", failures, "a referenced file is probably uncommitted");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

// 6. No em dashes in copy kids read.
// A house style rule, and cheap to enforce. Comments are exempt; this is about
// rendered text. Team-facing admin surfaces are out of scope.
async function checkNoEmDashInKidCopy() {
  const KID_PATHS = ["src/app/welcome", "src/app/play", "src/content", "src/components/game"];
  const files = sh("git ls-files 'src/**/*.ts' 'src/**/*.tsx'")
    .split("\n")
    .filter((f) => KID_PATHS.some((p) => f.startsWith(p)));

  const failures = [];
  for (const f of files) {
    const lines = (await readFile(join(ROOT, f), "utf8")).split("\n");
    // Block and JSX comments span lines, so a line inside one has no marker of
    // its own; track open/close rather than testing each line in isolation.
    let inBlock = false;
    lines.forEach((line, i) => {
      const code = line.trim();
      const opens = /\{?\/\*/.test(line);
      const closes = /\*\/\}?/.test(line);
      const wasInBlock = inBlock;
      if (opens && !closes) inBlock = true;
      else if (closes && inBlock) inBlock = false;

      if (wasInBlock || opens || code.startsWith("//") || code.startsWith("*")) return;
      if (line.includes("—")) failures.push(`${f}:${i + 1}`);
    });
  }
  record("no em dashes in kid-facing copy", failures, "use a period or a comma instead");
}

console.log("\nPreflight\n");
checkNothingUncommitted();
await checkUntrackedButReferenced();
await checkReferencedAssetsCommitted();
await checkRoutesResolve();
checkCommittedTreeTypechecks();
await checkNoEmDashInKidCopy();

const failed = results.filter((r) => r.failures.length > 0);
console.log("");
if (failed.length) {
  console.log(`\x1b[31m${failed.length} check(s) failed.\x1b[0m Not safe to deploy.\n`);
  process.exit(1);
}
console.log("\x1b[32mAll checks passed.\x1b[0m\n");
