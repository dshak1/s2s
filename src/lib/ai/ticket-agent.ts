import OpenAI from "openai";
import { getSupabaseService } from "@/lib/supabase/service";
import {
  createBranch,
  githubBranchUrl,
  githubEnabled,
  readGitHubFile,
  validAiChangePath,
  writeGitHubBinaryFile,
  writeGitHubFile,
} from "@/lib/github";
import { ticketAttachmentUrl, PROBLEMS, type TicketProblem } from "@/lib/tickets";
import { elevenLabsEnabled, generateSpeech } from "@/lib/elevenlabs";
import { vercelEnabled, waitForPreview } from "@/lib/vercel";
import { emailEnabled, sendEmail, ticketAiReadyEmail } from "@/lib/email";
import { addAiArtifact, logAiStep, updateAiRun } from "./run-log";

type SupabaseService = NonNullable<ReturnType<typeof getSupabaseService>>;

type TicketContext = {
  id: string;
  ref: string;
  type: string;
  title: string;
  body: string | null;
  status: string;
  author_id: string | null;
  game_slug: string | null;
  item_id: string | null;
  problem: TicketProblem | null;
  preview_url: string | null;
};

type Comment = { body: string; author_id: string | null; created_at: string };
type Attachment = {
  kind: "image" | "link";
  storage_path: string | null;
  url: string | null;
  title: string | null;
};
type ContentItem = {
  id: string;
  kind: string;
  ref_slug: string;
  game_slug: string | null;
  payload: Record<string, unknown>;
};

type AudioRepair = {
  changedPath: string | null;
  commitSha: string | null;
  audioUrl: string | null;
  summary: string;
};

type Investigation = {
  summary: string;
  plan: string[];
  reproduction_steps: string[];
  evidence: string[];
  assumptions: string[];
  confidence: "low" | "medium" | "high";
  uncertainty: string[];
  inspiration: string[];
  improvement_opportunities: string[];
  recommended_research: string[];
  proposed_fix: string;
  proposed_diff?: string | null;
  tests: string[];
  edits?: Array<{ path: string; find: string; replace: string; reason: string }>;
  changed_files?: Array<{ path: string; content: string; reason: string }>;
  needs_human?: boolean;
};

const BASE_BRANCH = process.env.AI_BASE_BRANCH || "feat/pro-infra";
const MAX_FILE_CHANGES = 3;
const MAX_FILE_CHARS = 180_000;
const MAX_EXACT_EDIT_MATCHES = 3;
const GROQ_SOURCE_BUDGET = 14_000;
const DEFAULT_SOURCE_BUDGET = 80_000;
const GROQ_BASE_URL = "https://api.groq.com/openai/v1";

function aiProvider(): "openai" | "groq" {
  return process.env.AI_MODEL_PROVIDER?.toLowerCase() === "groq" ? "groq" : "openai";
}

export function ticketAiReadiness(): { enabled: boolean; missing: string[] } {
  const provider = aiProvider();
  const required: Array<[string, string | undefined]> = [
    provider === "groq"
      ? ["GROQ_API_KEY", process.env.GROQ_API_KEY]
      : ["OPENAI_API_KEY", process.env.OPENAI_API_KEY],
    ["GITHUB_TOKEN", process.env.GITHUB_TOKEN],
    ["VERCEL_TOKEN", process.env.VERCEL_TOKEN],
    ["SUPABASE_SERVICE_ROLE_KEY", process.env.SUPABASE_SERVICE_ROLE_KEY],
  ];
  const missing = required
    .filter(([, value]) => !value)
    .map(([key]) => key);
  return { enabled: missing.length === 0, missing };
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 42);
}

function extractPagePath(ticket: TicketContext): string | null {
  const raw = `${ticket.title}\n${ticket.body ?? ""}`;
  const match =
    raw.match(/\b(\/play(?:\/[a-z0-9-]+)?)\b/i) ?? raw.match(/Filed from\s+(\/[^\s.]+)/i);
  return match?.[1] ?? null;
}

function routeToSource(path: string): string | null {
  const clean = path.replace(/[?#].*$/, "").replace(/^\/+/, "");
  if (!clean) return "src/app/page.tsx";
  return `src/app/${clean}/page.tsx`;
}

function candidateFiles(ticket: TicketContext): string[] {
  const files = new Set<string>();
  const haystack = `${ticket.title}\n${ticket.body ?? ""}`.toLowerCase();
  const visualPlayRequest =
    /\b(circle|triangle|square|shape|image|middle|center|centre|yellow|red|overlay)\b/.test(
      haystack,
    );

  if (visualPlayRequest && !ticket.game_slug) files.add("src/app/play/page.tsx");

  const pagePath = extractPagePath(ticket);
  if (pagePath) {
    const source = routeToSource(pagePath);
    if (source) files.add(source);
  }

  if (ticket.game_slug) files.add(`src/app/play/${ticket.game_slug}/page.tsx`);

  if (haystack.includes("feedback") || haystack.includes("screenshot")) {
    files.add("src/components/feedback-button.tsx");
    files.add("src/app/api/feedback/route.ts");
  }
  if (ticket.type === "question" || ticket.item_id) {
    files.add("src/components/report-question.tsx");
    files.add("src/app/api/report-question/route.ts");
    files.add("src/lib/items.ts");
  }
  if (isAudioTicket(ticket)) {
    files.add("src/lib/audio.ts");
    files.add("src/content/letter-audio.ts");
    files.add("src/content/greetings.ts");
  }
  if (!visualPlayRequest && (haystack.includes("ticket") || haystack.includes("dashboard"))) {
    files.add("src/app/tickets/page.tsx");
    files.add("src/app/tickets/actions.ts");
    files.add("src/app/tickets/forms.tsx");
  }

  files.add("src/lib/tickets.ts");
  files.add("README.md");
  files.add("docs/architecture.md");

  return Array.from(files).slice(0, 8);
}

function isAudioTicket(ticket: TicketContext): boolean {
  const haystack = `${ticket.title}\n${ticket.body ?? ""}`.toLowerCase();
  return (
    ticket.problem === "bad_audio" ||
    /\b(audio|sound|voice|pronunciation|pronounce|said wrong|tts|elevenlabs|11 labs)\b/.test(
      haystack,
    )
  );
}

function stringPayloadValue(payload: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = payload[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function audioText(ticket: TicketContext, contentItem: ContentItem | null): string | null {
  if (contentItem) {
    const fromPayload = stringPayloadValue(contentItem.payload, ["kk", "cyr", "text", "latin"]);
    if (fromPayload) return fromPayload;
    return contentItem.ref_slug;
  }

  const raw = `${ticket.title}\n${ticket.body ?? ""}`;
  const quoted =
    raw.match(/["“']([^"“”']{1,80})["”']/)?.[1] ??
    raw.match(/\b(?:say|pronounce|audio for)\s+([^.\n]{1,80})/i)?.[1];
  return quoted?.trim() || ticket.item_id || null;
}

function audioPublicPath(contentItem: ContentItem | null): string | null {
  const path =
    contentItem && typeof contentItem.payload.audio === "string"
      ? contentItem.payload.audio.trim()
      : "";
  if (!path || !path.startsWith("/audio/") || !path.endsWith(".mp3")) return null;
  return `public${path}`;
}

function storageSlug(value: string): string {
  return (
    value
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 42) || "audio"
  );
}

function sourcePacket(
  files: Array<{ path: string; content: string }>,
  budget: number,
): Array<{ path: string; content: string; truncated: boolean }> {
  const packet: Array<{ path: string; content: string; truncated: boolean }> = [];
  let remaining = budget;
  for (const file of files) {
    if (remaining <= 0) break;
    const allowance = Math.min(file.content.length, remaining);
    packet.push({
      path: file.path,
      content: file.content.slice(0, allowance),
      truncated: allowance < file.content.length,
    });
    remaining -= allowance;
  }
  return packet;
}

function extractFirstJsonObject(text: string): string | null {
  const start = text.indexOf("{");
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = start; index < text.length; index += 1) {
    const char = text[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === "\\") {
      escaped = inString;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (char === "{") depth += 1;
    if (char === "}") {
      depth -= 1;
      if (depth === 0) return text.slice(start, index + 1);
    }
  }

  return null;
}

function parseJsonObject(text: string): Investigation {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```json\s*([\s\S]*?)```/i)?.[1];
  const raw = extractFirstJsonObject(fenced ?? trimmed) ?? trimmed;
  const parsed = JSON.parse(raw) as Partial<Investigation>;
  const confidence = ["low", "medium", "high"].includes(String(parsed.confidence))
    ? (String(parsed.confidence) as Investigation["confidence"])
    : "medium";
  return {
    summary: String(parsed.summary ?? "AI investigation completed."),
    plan: Array.isArray(parsed.plan) ? parsed.plan.map(String) : [],
    reproduction_steps: Array.isArray(parsed.reproduction_steps)
      ? parsed.reproduction_steps.map(String)
      : [],
    evidence: Array.isArray(parsed.evidence) ? parsed.evidence.map(String) : [],
    assumptions: Array.isArray(parsed.assumptions) ? parsed.assumptions.map(String) : [],
    confidence,
    uncertainty: Array.isArray(parsed.uncertainty) ? parsed.uncertainty.map(String) : [],
    inspiration: Array.isArray(parsed.inspiration) ? parsed.inspiration.map(String) : [],
    improvement_opportunities: Array.isArray(parsed.improvement_opportunities)
      ? parsed.improvement_opportunities.map(String)
      : [],
    recommended_research: Array.isArray(parsed.recommended_research)
      ? parsed.recommended_research.map(String)
      : [],
    proposed_fix: String(parsed.proposed_fix ?? "No fix proposed."),
    proposed_diff: parsed.proposed_diff ? String(parsed.proposed_diff) : null,
    tests: Array.isArray(parsed.tests) ? parsed.tests.map(String) : [],
    edits: Array.isArray(parsed.edits)
      ? parsed.edits
          .map((edit) => ({
            path: String((edit as { path?: unknown }).path ?? ""),
            find: String((edit as { find?: unknown }).find ?? ""),
            replace: String((edit as { replace?: unknown }).replace ?? ""),
            reason: String((edit as { reason?: unknown }).reason ?? ""),
          }))
          .filter((edit) => edit.path && edit.find && edit.replace)
      : [],
    changed_files: Array.isArray(parsed.changed_files)
      ? parsed.changed_files
          .map((file) => ({
            path: String((file as { path?: unknown }).path ?? ""),
            content: String((file as { content?: unknown }).content ?? ""),
            reason: String((file as { reason?: unknown }).reason ?? ""),
          }))
          .filter((file) => file.path && file.content)
      : [],
    needs_human: Boolean(parsed.needs_human),
  };
}

function outputText(response: unknown): string {
  const direct = (response as { output_text?: unknown }).output_text;
  if (typeof direct === "string") return direct;

  const output = (response as { output?: Array<unknown> }).output ?? [];
  const chunks: string[] = [];
  for (const item of output) {
    const content = (item as { content?: Array<unknown> }).content ?? [];
    for (const part of content) {
      const text = (part as { text?: unknown }).text;
      if (typeof text === "string") chunks.push(text);
    }
  }
  return chunks.join("\n");
}

function caseFile(input: {
  ticket: TicketContext;
  investigation: Investigation;
  branchUrl: string | null;
  previewUrl: string | null;
  changedFiles: string[];
}) {
  const problem = input.ticket.problem ? PROBLEMS[input.ticket.problem] : null;
  return [
    `# ${input.ticket.ref} AI Investigation`,
    "",
    `Ticket: ${input.ticket.title}`,
    `Type: ${input.ticket.type}`,
    input.ticket.game_slug ? `Game: ${input.ticket.game_slug}` : "",
    input.ticket.item_id ? `Item: ${input.ticket.item_id}` : "",
    problem ? `Problem: ${problem}` : "",
    "",
    "## Summary",
    input.investigation.summary,
    "",
    "## Reproduction Steps",
    ...(input.investigation.reproduction_steps.length
      ? input.investigation.reproduction_steps.map((step, index) => `${index + 1}. ${step}`)
      : ["No concrete reproduction steps were found."]),
    "",
    "## Plan",
    ...(input.investigation.plan.length
      ? input.investigation.plan.map((step, index) => `${index + 1}. ${step}`)
      : ["No plan was returned."]),
    "",
    "## Assumptions",
    ...(input.investigation.assumptions.length
      ? input.investigation.assumptions.map((item) => `- ${item}`)
      : ["- No assumptions were recorded."]),
    "",
    "## Confidence",
    input.investigation.confidence,
    "",
    "## Uncertainty",
    ...(input.investigation.uncertainty.length
      ? input.investigation.uncertainty.map((item) => `- ${item}`)
      : ["- No uncertainty was recorded."]),
    "",
    "## Evidence",
    ...(input.investigation.evidence.length
      ? input.investigation.evidence.map((item) => `- ${item}`)
      : ["- No external evidence recorded."]),
    "",
    "## Inspiration / Prior Art",
    ...(input.investigation.inspiration.length
      ? input.investigation.inspiration.map((item) => `- ${item}`)
      : ["- No outside inspiration was recorded."]),
    "",
    "## Improvement Opportunities",
    ...(input.investigation.improvement_opportunities.length
      ? input.investigation.improvement_opportunities.map((item) => `- ${item}`)
      : ["- No follow-up improvements were recorded."]),
    "",
    "## Recommended Research",
    ...(input.investigation.recommended_research.length
      ? input.investigation.recommended_research.map((item) => `- ${item}`)
      : ["- No deeper research was requested."]),
    "",
    "## Attempted Fix",
    input.investigation.proposed_fix,
    "",
    "## Changed Files",
    ...(input.changedFiles.length
      ? input.changedFiles.map((file) => `- ${file}`)
      : ["- No source file was changed by the AI run."]),
    "",
    "## Proposed Diff",
    "```diff",
    input.investigation.proposed_diff ?? "No diff was provided.",
    "```",
    "",
    "## Tests To Run",
    ...(input.investigation.tests.length
      ? input.investigation.tests.map((test) => `- ${test}`)
      : ["- pnpm lint", "- pnpm build"]),
    "",
    "## Links",
    input.branchUrl ? `Branch: ${input.branchUrl}` : "Branch: not created",
    input.previewUrl ? `Preview: ${input.previewUrl}` : "Preview: not ready",
    "",
  ]
    .filter((line) => line !== "")
    .join("\n");
}

async function loadTicketBundle(sb: SupabaseService, ticketId: string) {
  const [{ data: ticket }, { data: comments }, { data: attachments }] = await Promise.all([
    sb.from("tickets").select("*").eq("id", ticketId).maybeSingle(),
    sb
      .from("ticket_comments")
      .select("body, author_id, created_at")
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: true }),
    sb.from("ticket_attachments").select("*").eq("ticket_id", ticketId),
  ]);

  if (!ticket) throw new Error("Ticket not found.");
  let contentItem: ContentItem | null = null;
  const itemId = String((ticket as TicketContext).item_id ?? "");
  if (itemId) {
    const { data: item } = await sb
      .from("content_items")
      .select("id, kind, ref_slug, game_slug, payload")
      .eq("id", itemId)
      .maybeSingle();
    if (item) contentItem = item as ContentItem;
  }

  return {
    ticket: ticket as TicketContext,
    comments: (comments ?? []) as Comment[],
    attachments: (attachments ?? []) as Attachment[],
    contentItem,
  };
}

async function runModelInvestigation(input: {
  ticket: TicketContext;
  comments: Comment[];
  attachments: Attachment[];
  contentItem: ContentItem | null;
  files: Array<{ path: string; content: string }>;
}): Promise<Investigation> {
  const provider = aiProvider();
  const client = new OpenAI({
    apiKey: provider === "groq" ? process.env.GROQ_API_KEY : process.env.OPENAI_API_KEY,
    ...(provider === "groq" ? { baseURL: GROQ_BASE_URL } : {}),
  });
  const model =
    provider === "groq"
      ? process.env.GROQ_MODEL || process.env.OPENAI_MODEL || "openai/gpt-oss-20b"
      : process.env.OPENAI_MODEL || "gpt-5.6";
  const attachmentUrls = input.attachments.map((a) =>
    a.kind === "image" && a.storage_path ? ticketAttachmentUrl(a.storage_path) : a.url,
  );
  const sourceBudget = provider === "groq" ? GROQ_SOURCE_BUDGET : DEFAULT_SOURCE_BUDGET;
  const packet = sourcePacket(input.files, sourceBudget);
  const prompt = [
    "You are investigating a Steppe to Screen ticket. Return only JSON.",
    "Goal: reproduce the issue from the ticket, explain evidence, propose a safe fix, and if confident return exact edits for at most three existing files.",
    "Be critical of your own work. State your plan, assumptions, confidence, uncertainty, useful inspiration, missing tools, and where a human or external research tool should help.",
    "Do not reveal hidden chain-of-thought. Provide concise audit-ready rationale summaries instead.",
    "Do not modify env files, lockfiles, migrations, secrets, auth policy, or unrelated files.",
    "If you are not confident, set needs_human true and leave changed_files empty.",
    "Prefer edits over changed_files. Each edit must contain an exact find string copied from a candidate file and the replacement string. Use changed_files only for short files.",
    "",
    "Required JSON shape:",
    '{"summary":"...","plan":["..."],"reproduction_steps":["..."],"evidence":["..."],"assumptions":["..."],"confidence":"low|medium|high","uncertainty":["..."],"inspiration":["..."],"improvement_opportunities":["..."],"recommended_research":["..."],"proposed_fix":"...","proposed_diff":"unified diff or null","tests":["pnpm lint","pnpm build"],"needs_human":false,"edits":[{"path":"src/...","reason":"...","find":"exact existing text","replace":"replacement text"}],"changed_files":[{"path":"src/...","reason":"...","content":"complete file content"}]}',
    "",
    "Ticket:",
    JSON.stringify(input.ticket, null, 2),
    "",
    "Comments:",
    JSON.stringify(input.comments, null, 2),
    "",
    "Content item, if the ticket is tied to one:",
    JSON.stringify(input.contentItem, null, 2),
    "",
    "Attachments:",
    JSON.stringify(attachmentUrls.filter(Boolean), null, 2),
    "",
    "Candidate file contents:",
    packet
      .map((file) => `--- ${file.path}${file.truncated ? " (truncated)" : ""} ---\n${file.content}`)
      .join("\n\n"),
  ].join("\n");

  let raw: string;
  if (provider === "groq") {
    const response = await client.chat.completions.create({
      model,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.2,
      max_completion_tokens: 2200,
    } as never);
    raw = response.choices[0]?.message?.content ?? "";
  } else {
    const useHostedWebSearch = process.env.AI_DISABLE_WEB_SEARCH !== "1";
    const response = await client.responses.create({
      model,
      ...(useHostedWebSearch ? { tools: [{ type: "web_search" }] } : {}),
      input: prompt,
    } as never);
    raw = outputText(response);
  }

  try {
    return parseJsonObject(raw);
  } catch (err) {
    if (provider !== "groq") throw err;
    const repair = await client.chat.completions.create({
      model,
      messages: [
        {
          role: "user",
          content: [
            "Repair this AI investigation output into one valid JSON object matching the required shape.",
            "Do not add markdown. If fields are missing, use empty arrays and needs_human true.",
            raw.slice(0, 12_000),
          ].join("\n\n"),
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0,
      max_completion_tokens: 1600,
    } as never);
    return parseJsonObject(repair.choices[0]?.message?.content ?? "");
  }
}

function applyExactEdit(content: string, edit: { find: string; replace: string }) {
  const count = content.split(edit.find).length - 1;
  if (count < 1 || count > MAX_EXACT_EDIT_MATCHES) {
    throw new Error(
      `Expected 1-${MAX_EXACT_EDIT_MATCHES} exact matches for edit, found ${count}.`,
    );
  }
  return {
    content: content.split(edit.find).join(edit.replace),
    matchCount: count,
  };
}

async function attachAudioPreview(
  sb: SupabaseService,
  input: {
    runId: string;
    ticketId: string;
    actorId: string;
    text: string;
    audio: Buffer;
    contentType: string;
    voiceId: string;
    modelId: string;
  },
): Promise<string | null> {
  const storagePath = `ai-audio/${input.runId}/${storageSlug(input.text)}.mp3`;
  const { error } = await sb.storage.from("idea-attachments").upload(storagePath, input.audio, {
    contentType: input.contentType,
    upsert: true,
  });
  if (error) {
    await logAiStep(sb, input.runId, "audio", "Generated audio but could not upload the preview.", {
      error: error.message,
    });
    return null;
  }

  const audioUrl = ticketAttachmentUrl(storagePath);
  await addAiArtifact(sb, {
    runId: input.runId,
    kind: "test_output",
    title: `Generated audio preview: ${input.text}`,
    url: audioUrl,
    metadata: {
      text: input.text,
      voiceId: input.voiceId,
      modelId: input.modelId,
    },
  });
  await sb.from("ticket_attachments").insert({
    ticket_id: input.ticketId,
    author_id: input.actorId,
    kind: "link",
    url: audioUrl,
    title: `Generated audio: ${input.text}`,
  });
  return audioUrl;
}

async function attemptAudioRepair(
  sb: SupabaseService,
  input: {
    runId: string;
    ticket: TicketContext;
    contentItem: ContentItem | null;
    branch: string;
    actorId: string;
  },
): Promise<AudioRepair | null> {
  if (!isAudioTicket(input.ticket)) return null;

  const text = audioText(input.ticket, input.contentItem);
  if (!text) {
    await logAiStep(sb, input.runId, "audio", "Audio ticket detected but no target text was found.");
    await addAiArtifact(sb, {
      runId: input.runId,
      kind: "note",
      title: "Audio repair needs human input",
      body: "The agent detected an audio/pronunciation ticket but could not determine the word, letter, or phrase to regenerate.",
    });
    return {
      changedPath: null,
      commitSha: null,
      audioUrl: null,
      summary: "Audio repair needs the exact word or phrase before it can regenerate a clip.",
    };
  }

  if (!elevenLabsEnabled()) {
    await logAiStep(sb, input.runId, "audio", "Audio ticket detected, but ElevenLabs is not configured.");
    await addAiArtifact(sb, {
      runId: input.runId,
      kind: "note",
      title: "Audio repair not configured",
      body: "Set ELEVENLABS_API_KEY, and optionally ELEVENLABS_VOICE_ID, to let AI generate replacement pronunciation clips.",
    });
    return {
      changedPath: null,
      commitSha: null,
      audioUrl: null,
      summary: "ElevenLabs is not configured, so AI could not generate replacement audio.",
    };
  }

  await logAiStep(sb, input.runId, "audio", `Generating replacement audio for "${text}".`);
  const generated = await generateSpeech({ text });
  const audioUrl = await attachAudioPreview(sb, {
    runId: input.runId,
    ticketId: input.ticket.id,
    actorId: input.actorId,
    text,
    audio: generated.content,
    contentType: generated.contentType,
    voiceId: generated.voiceId,
    modelId: generated.modelId,
  });

  const targetPath = audioPublicPath(input.contentItem);
  if (!targetPath) {
    const summary =
      audioUrl
        ? `Generated an audio preview for "${text}", but no existing public audio path was attached to the content item.`
        : `Generated replacement audio for "${text}", but no existing public audio path was attached to the content item.`;
    await logAiStep(sb, input.runId, "audio", summary, { audioUrl });
    return { changedPath: null, commitSha: null, audioUrl, summary };
  }

  const commitSha = await writeGitHubBinaryFile({
    branch: input.branch,
    path: targetPath,
    content: generated.content,
    message: `${input.ticket.ref} AI audio repair: ${targetPath}`,
  });
  await updateAiRun(sb, input.runId, { commit_sha: commitSha });
  await logAiStep(sb, input.runId, "commit", `Committed replacement audio to ${targetPath}.`, {
    text,
    commitSha,
    audioUrl,
  });
  return {
    changedPath: targetPath,
    commitSha,
    audioUrl,
    summary: `Generated and committed replacement audio for "${text}" at ${targetPath}.`,
  };
}

async function recordPreviewSmoke(sb: SupabaseService, runId: string, previewUrl: string) {
  try {
    const startedAt = Date.now();
    const res = await fetch(previewUrl, { cache: "no-store" });
    const body = await res.text();
    const metadata = {
      url: previewUrl,
      status: res.status,
      ok: res.ok,
      bytes: body.length,
      durationMs: Date.now() - startedAt,
    };
    await logAiStep(
      sb,
      runId,
      "verify",
      res.ok ? "Preview smoke check passed." : "Preview smoke check did not return OK.",
      metadata,
    );
    await addAiArtifact(sb, {
      runId,
      kind: "test_output",
      title: "Preview smoke check",
      body: JSON.stringify(metadata, null, 2),
      metadata,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Preview smoke check failed.";
    await logAiStep(sb, runId, "verify", message);
  }
}

export async function investigateTicketRun(runId: string, actorId: string) {
  const sb = getSupabaseService();
  if (!sb) return;

  try {
    await updateAiRun(sb, runId, { status: "running", started_at: new Date().toISOString() });
    await logAiStep(sb, runId, "start", "Started AI investigation.");

    const { data: run } = await sb
      .from("ticket_ai_runs")
      .select("ticket_id")
      .eq("id", runId)
      .maybeSingle();
    if (!run?.ticket_id) throw new Error("Run is missing its ticket.");

    const { ticket, comments, attachments, contentItem } = await loadTicketBundle(
      sb,
      String(run.ticket_id),
    );
    await logAiStep(sb, runId, "context", `Loaded ${ticket.ref} context.`, {
      comments: comments.length,
      attachments: attachments.length,
      contentItem: contentItem?.id ?? null,
    });
    await addAiArtifact(sb, {
      runId,
      kind: "note",
      title: "Investigation contract",
      body: [
        "The agent will inspect ticket context, attachments, likely source files, and available web/tool context.",
        "It must record a plan, assumptions, confidence, uncertainty, and follow-up opportunities.",
        "It may commit at most three guarded source-file replacements on an isolated branch.",
        "It must leave env files, lockfiles, migrations, secrets, auth policy, and unrelated files untouched.",
      ].join("\n"),
    });

    for (const attachment of attachments) {
      if (attachment.kind === "image" && attachment.storage_path) {
        await addAiArtifact(sb, {
          runId,
          kind: "screenshot",
          title: attachment.title ?? "Submitted screenshot",
          url: ticketAttachmentUrl(attachment.storage_path),
        });
      }
    }

    if (aiProvider() === "groq") {
      if (!process.env.GROQ_API_KEY) throw new Error("Set GROQ_API_KEY.");
    } else if (!process.env.OPENAI_API_KEY) {
      throw new Error("Set OPENAI_API_KEY.");
    }
    if (!githubEnabled()) throw new Error("Set GITHUB_TOKEN.");

    const branch = `ai/${ticket.ref.toLowerCase()}-${slugify(ticket.title)}-${runId.slice(0, 8)}`;
    await createBranch({ branch, fromBranch: BASE_BRANCH });
    const branchUrl = githubBranchUrl(branch);
    await updateAiRun(sb, runId, { branch_name: branch, branch_url: branchUrl });
    await addAiArtifact(sb, { runId, kind: "branch", title: branch, url: branchUrl });
    await logAiStep(sb, runId, "branch", `Created branch ${branch}.`, { branchUrl });

    const paths = candidateFiles(ticket);
    const files: Array<{ path: string; content: string }> = [];
    for (const path of paths) {
      const file = await readGitHubFile(path, BASE_BRANCH);
      if (file) files.push({ path: file.path, content: file.content });
    }
    await logAiStep(sb, runId, "source", `Loaded ${files.length} candidate files.`, {
      files: files.map((file) => file.path),
    });
    await addAiArtifact(sb, {
      runId,
      kind: "note",
      title: "Source files considered",
      body: files.map((file) => `- ${file.path}`).join("\n") || "No candidate files loaded.",
    });

    const investigation = await runModelInvestigation({
      ticket,
      comments,
      attachments,
      contentItem,
      files,
    });
    await logAiStep(sb, runId, "analysis", investigation.summary, {
      needsHuman: investigation.needs_human,
      confidence: investigation.confidence,
    });
    await addAiArtifact(sb, {
      runId,
      kind: "note",
      title: "Plan",
      body: investigation.plan.map((item, index) => `${index + 1}. ${item}`).join("\n"),
    });
    await addAiArtifact(sb, {
      runId,
      kind: "note",
      title: "Assumptions",
      body: investigation.assumptions.map((item) => `- ${item}`).join("\n"),
      metadata: { confidence: investigation.confidence },
    });
    await addAiArtifact(sb, {
      runId,
      kind: "note",
      title: "Uncertainty and confidence",
      body: [
        `Confidence: ${investigation.confidence}`,
        "",
        ...(investigation.uncertainty.length
          ? investigation.uncertainty.map((item) => `- ${item}`)
          : ["- No uncertainty was recorded."]),
      ].join("\n"),
    });
    await addAiArtifact(sb, {
      runId,
      kind: "note",
      title: "Inspiration and research",
      body: [
        "Inspiration:",
        ...(investigation.inspiration.length
          ? investigation.inspiration.map((item) => `- ${item}`)
          : ["- No outside inspiration was recorded."]),
        "",
        "Recommended deeper research:",
        ...(investigation.recommended_research.length
          ? investigation.recommended_research.map((item) => `- ${item}`)
          : ["- No deeper research was requested."]),
      ].join("\n"),
    });
    await addAiArtifact(sb, {
      runId,
      kind: "note",
      title: "Follow-up opportunities",
      body: investigation.improvement_opportunities.map((item) => `- ${item}`).join("\n"),
    });

    if (investigation.proposed_diff) {
      await addAiArtifact(sb, {
        runId,
        kind: "diff",
        title: "Proposed diff",
        body: investigation.proposed_diff,
      });
    }

    const changedFiles: string[] = [];
    const audioRepair = await attemptAudioRepair(sb, {
      runId,
      ticket,
      contentItem,
      branch,
      actorId,
    });
    if (audioRepair?.changedPath) {
      changedFiles.push(audioRepair.changedPath);
    }

    for (const edit of (investigation.edits ?? []).slice(0, MAX_FILE_CHANGES)) {
      if (changedFiles.length >= MAX_FILE_CHANGES) break;
      if (!validAiChangePath(edit.path)) {
        await logAiStep(sb, runId, "guardrail", `Skipped unsafe path ${edit.path}.`, {
          reason: edit.reason,
        });
        continue;
      }
      const existing = await readGitHubFile(edit.path, branch);
      if (!existing) {
        await logAiStep(sb, runId, "guardrail", `Skipped missing file ${edit.path}.`, {
          reason: edit.reason,
        });
        continue;
      }
      const applied = applyExactEdit(existing.content, edit);
      if (applied.content.length > MAX_FILE_CHARS) {
        await logAiStep(sb, runId, "guardrail", `Skipped oversized edit ${edit.path}.`, {
          chars: applied.content.length,
        });
        continue;
      }
      const commitSha = await writeGitHubFile({
        branch,
        path: edit.path,
        content: applied.content,
        message: `${ticket.ref} AI edit: ${edit.path}`,
      });
      changedFiles.push(edit.path);
      await updateAiRun(sb, runId, { commit_sha: commitSha });
      await logAiStep(sb, runId, "commit", `Committed edit to ${edit.path}.`, {
        reason: edit.reason,
        commitSha,
        exactMatches: applied.matchCount,
      });
    }

    for (const file of (investigation.changed_files ?? []).slice(0, MAX_FILE_CHANGES)) {
      if (changedFiles.length >= MAX_FILE_CHANGES) break;
      if (!validAiChangePath(file.path)) {
        await logAiStep(sb, runId, "guardrail", `Skipped unsafe path ${file.path}.`, {
          reason: file.reason,
        });
        continue;
      }
      if (file.content.length > MAX_FILE_CHARS) {
        await logAiStep(sb, runId, "guardrail", `Skipped oversized change ${file.path}.`, {
          chars: file.content.length,
        });
        continue;
      }
      const commitSha = await writeGitHubFile({
        branch,
        path: file.path,
        content: file.content,
        message: `${ticket.ref} AI attempt: ${file.path}`,
      });
      changedFiles.push(file.path);
      await updateAiRun(sb, runId, { commit_sha: commitSha });
      await logAiStep(sb, runId, "commit", `Committed ${file.path}.`, {
        reason: file.reason,
        commitSha,
      });
    }

    const casePath = `ai-cases/${ticket.ref}-${runId.slice(0, 8)}.md`;
    const caseBody = caseFile({
      ticket,
      investigation,
      branchUrl,
      previewUrl: null,
      changedFiles,
    });
    const caseCommitSha = await writeGitHubFile({
      branch,
      path: casePath,
      content: caseBody,
      message: `${ticket.ref} AI investigation case`,
    });
    await updateAiRun(sb, runId, { commit_sha: caseCommitSha });
    await addAiArtifact(sb, {
      runId,
      kind: "case_file",
      title: casePath,
      url: `${branchUrl}/${casePath}`,
      body: caseBody,
    });

    let previewUrl: string | null = null;
    if (vercelEnabled()) {
      await logAiStep(sb, runId, "deploy", "Waiting for Vercel preview deployment.");
      previewUrl = await waitForPreview({ branch, commitSha: caseCommitSha });
    }
    if (previewUrl) await recordPreviewSmoke(sb, runId, previewUrl);

    const automatedRepair = Boolean(audioRepair?.changedPath);
    const finalStatus = previewUrl && changedFiles.length > 0 && (!investigation.needs_human || automatedRepair)
      ? "ready"
      : "needs_human";
    const finalSummary = [
      investigation.summary,
      audioRepair?.summary,
      changedFiles.length
        ? `AI committed ${changedFiles.length} file change${changedFiles.length === 1 ? "" : "s"}.`
        : "AI did not commit source changes.",
      previewUrl ? `Preview is ready: ${previewUrl}` : "No Vercel preview was found yet.",
    ].filter(Boolean).join(" ");

    await updateAiRun(sb, runId, {
      status: finalStatus,
      preview_url: previewUrl,
      summary: finalSummary,
      finished_at: new Date().toISOString(),
    });

    if (previewUrl) {
      await addAiArtifact(sb, {
        runId,
        kind: "deployment",
        title: "Vercel preview",
        url: previewUrl,
      });
    }

    await sb.from("ticket_comments").insert({
      ticket_id: ticket.id,
      author_id: actorId,
      body: finalSummary,
    });

    await sb
      .from("tickets")
      .update({
        status: "needs_review",
        decision_note: finalSummary.slice(0, 1800),
        decided_by: actorId,
        decided_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...(previewUrl ? { preview_url: previewUrl } : {}),
      })
      .eq("id", ticket.id);

    await logAiStep(sb, runId, "finish", finalSummary, { previewUrl, changedFiles });

    const { data: actor } = await sb
      .from("team_members")
      .select("email")
      .eq("id", actorId)
      .maybeSingle();
    const to = process.env.AI_NOTIFY_EMAIL || (actor?.email as string | undefined);
    if (to && emailEnabled()) {
      await sendEmail({
        to,
        ...ticketAiReadyEmail({
          ref: ticket.ref,
          title: ticket.title,
          status: finalStatus,
          summary: finalSummary,
          previewUrl,
          branchUrl,
        }),
      });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI investigation failed.";
    await updateAiRun(sb, runId, {
      status: "failed",
      error: message,
      finished_at: new Date().toISOString(),
    });
    await logAiStep(sb, runId, "failed", message);
  }
}
