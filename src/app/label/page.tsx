import { requireTeam, type TeamMember } from "@/lib/auth";
import { getSupabaseServer } from "@/lib/supabase/server";
import { TeamNav } from "@/components/dashboard/team-nav";
import { Card, EmptyNote, StatTile } from "@/components/dashboard/viz";
import { refreshAnalyticsTasks } from "./actions";
import { LabelQueue, type QueueItem } from "./queue";

export const metadata = { title: "Label · Steppe to Screen" };
export const dynamic = "force-dynamic";

type RaterStat = {
  rater_id: string;
  labels: number;
  flagged_bad: number;
  voice_notes: number;
  avg_seconds: number | null;
};

export default async function LabelPage() {
  const member = await requireTeam(undefined, "/label");
  const sb = await getSupabaseServer();

  if (!sb) {
    return (
      <div className="min-h-dvh bg-warm font-admin">
        <TeamNav member={member} current="/label" />
        <main className="mx-auto max-w-3xl px-4 py-8">
          <EmptyNote>Offline demo mode — labelling needs Supabase.</EmptyNote>
        </main>
      </div>
    );
  }

  const [queueRes, ratersRes, teamRes] = await Promise.all([
    sb.rpc("label_queue", { p_limit: 25 }),
    sb.from("v_rater_stats").select("*").order("labels", { ascending: false }),
    sb.from("team_members").select("id, display_name"),
  ]);

  const items = (queueRes.data ?? []) as QueueItem[];
  const raters = (ratersRes.data ?? []) as RaterStat[];
  const names = new Map(
    ((teamRes.data ?? []) as Array<Pick<TeamMember, "id" | "display_name">>).map((t) => [
      t.id,
      t.display_name,
    ]),
  );
  const mine = raters.find((r) => r.rater_id === member.id);

  return (
    <div className="min-h-dvh bg-warm font-admin">
      <TeamNav member={member} current="/label" />

      <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
        <div>
          <h1 className="text-2xl font-black text-steppe">Judge the questions</h1>
          <p className="mt-1 text-sm font-semibold text-wolf">
            Learner data tells us a question is hard. It can&apos;t tell us whether the
            audio is wrong, the options are unfair, or nobody actually says it that way
            in Kazakh. That part only you can answer — and every judgement you leave
            here becomes part of the dataset.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <StatTile
            label="Your labels"
            value={String(mine?.labels ?? 0)}
            hint={mine?.avg_seconds ? `${mine.avg_seconds}s each on average` : "start anywhere"}
          />
          <StatTile
            label="You flagged"
            value={String(mine?.flagged_bad ?? 0)}
            hint="questions the team should fix"
          />
          <StatTile
            label="Waiting for you"
            value={String(items.length)}
            hint="highest-signal first"
          />
        </div>

        <LabelQueue items={items} />

        <Card
          title="Who's labelling"
          subtitle="Every label is credited. This is the record of who built the dataset."
        >
          {raters.length === 0 ? (
            <EmptyNote>Nobody has labelled anything yet. Be first.</EmptyNote>
          ) : (
            <ul className="space-y-2">
              {raters.map((r) => (
                <li
                  key={r.rater_id}
                  className="flex items-center justify-between gap-3 border-b border-felt/60 pb-2 last:border-0"
                >
                  <span className="font-bold text-steppe">
                    {names.get(r.rater_id) ?? "Team member"}
                    {r.rater_id === member.id && (
                      <span className="ml-2 text-xs font-bold text-wolf">(you)</span>
                    )}
                  </span>
                  <span className="text-sm font-black tabular-nums text-steppe">
                    {r.labels}
                    <span className="ml-2 text-xs font-semibold text-wolf">
                      {r.flagged_bad} flagged · {r.voice_notes} voice
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
          <form action={refreshAnalyticsTasks} className="mt-4">
            <button
              type="submit"
              className="rounded-full border-2 border-steppe bg-white px-3 py-1.5 text-xs font-black text-steppe transition hover:bg-steppe/5"
            >
              Pull in newly-flagged questions
            </button>
          </form>
        </Card>
      </main>
    </div>
  );
}
