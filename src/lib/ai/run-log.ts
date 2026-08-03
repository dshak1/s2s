import type { getSupabaseService } from "@/lib/supabase/service";

type SupabaseService = NonNullable<ReturnType<typeof getSupabaseService>>;

export async function logAiStep(
  sb: SupabaseService,
  runId: string,
  stepType: string,
  summary: string,
  metadata: Record<string, unknown> = {},
) {
  await sb.from("ticket_ai_steps").insert({
    run_id: runId,
    step_type: stepType,
    summary,
    metadata,
  });
}

export async function addAiArtifact(
  sb: SupabaseService,
  input: {
    runId: string;
    kind: "case_file" | "screenshot" | "diff" | "deployment" | "branch" | "test_output" | "note";
    title: string;
    url?: string | null;
    storagePath?: string | null;
    body?: string | null;
    metadata?: Record<string, unknown>;
  },
) {
  await sb.from("ticket_ai_artifacts").insert({
    run_id: input.runId,
    kind: input.kind,
    title: input.title,
    url: input.url ?? null,
    storage_path: input.storagePath ?? null,
    body: input.body ?? null,
    metadata: input.metadata ?? {},
  });
}

export async function updateAiRun(
  sb: SupabaseService,
  runId: string,
  patch: Record<string, unknown>,
) {
  await sb
    .from("ticket_ai_runs")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", runId);
}
