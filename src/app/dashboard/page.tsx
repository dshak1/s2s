import { requireTeam, isDemoMember } from "@/lib/auth";
import { getSupabaseServer } from "@/lib/supabase/server";
import { GAMES } from "@/content/games";
import { AdminShell, Empty, Panel } from "@/components/admin/shell";
import { BarRows, Columns, Stat, StatusChip } from "@/components/admin/viz";

export const metadata = { title: "Dashboard · Steppe to Screen" };
export const dynamic = "force-dynamic";

type ItemStat = {
  item_id: string;
  kind: string;
  ref_slug: string;
  game_slug: string | null;
  status: string;
  payload: Record<string, unknown>;
  attempts: number;
  correct: number;
  p_value: number | null;
  median_latency_ms: number | null;
  avg_audio_plays: number | null;
  learners: number;
};

type GameStat = {
  game_slug: string;
  events: number;
  accuracy: number | null;
  median_latency_ms: number | null;
  learners: number;
  items_touched: number;
};

type WeekRow = {
  week: string;
  active_learners: number;
  events: number;
  correct: number;
};

const GAME_TITLES = new Map(GAMES.map((g) => [g.slug, g.title]));

// The item's own text, so a row in "questions to look at" is readable without
// cross-referencing the content files.
function itemLabel(kind: string, payload: Record<string, unknown>, refSlug: string): string {
  const p = payload as { kk?: string; en?: string; cyr?: string; name?: string };
  if (kind === "vocab") return `${p.kk ?? refSlug} · ${p.en ?? ""}`.trim();
  if (kind === "letter") return p.cyr ?? refSlug;
  if (kind === "greeting") return `${p.kk ?? refSlug} · ${p.en ?? ""}`.trim();
  if (kind === "place") return p.name ?? refSlug;
  return p.kk ?? refSlug;
}

function pct(n: number | null | undefined): string {
  return n === null || n === undefined ? "-" : `${Math.round(n * 100)}%`;
}

function weekLabel(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default async function DashboardPage() {
  const member = await requireTeam(undefined, "/dashboard");
  const sb = await getSupabaseServer();

  if (!sb) {
    return (
      <AdminShell member={member} current="/dashboard" title="Dashboard">
        <Empty>
          Offline demo mode. Supabase env vars are not set, so there is nothing to
          report on yet.
        </Empty>
      </AdminShell>
    );
  }

  const [itemsRes, gamesRes, weeklyRes, feedbackRes, ticketsRes] =
    await Promise.all([
      sb.from("v_item_stats").select("*"),
      sb.from("v_game_stats").select("*").order("events", { ascending: false }),
      sb.from("v_learner_weekly").select("*").limit(12),
      sb.from("feedback_items").select("kind"),
      sb.from("tickets").select("type, status"),
    ]);

  const items = (itemsRes.data ?? []) as ItemStat[];
  const gameStats = (gamesRes.data ?? []) as GameStat[];
  const weeks = ((weeklyRes.data ?? []) as WeekRow[]).slice().reverse();
  const feedback = (feedbackRes.data ?? []) as Array<{ kind: string }>;
  const tickets = (ticketsRes.data ?? []) as Array<{ type: string; status: string }>;

  const answered = items.filter((i) => i.attempts > 0);
  const totalAttempts = answered.reduce((n, i) => n + i.attempts, 0);
  const totalCorrect = answered.reduce((n, i) => n + i.correct, 0);
  // Per-game learner counts are distinct-device counts and can't be summed
  // across games, so the headline uses the busiest game as a floor.
  const maxLearners = Math.max(0, ...gameStats.map((g) => g.learners));

  const accuracy = totalAttempts > 0 ? totalCorrect / totalAttempts : null;

  // Item analysis: too hard (<20% correct) or too easy (>95%) are both signals
  // worth a human look. Anything under 5 attempts is still noise.
  // 5 was far too low. With two testers a 100% correct rate means "two people
  // got it right", not "this question teaches nothing". Item analysis needs a
  // real sample before it says anything, so the panel stays quiet until then.
  const MIN_ATTEMPTS = 30;
  const graded = answered.filter((i) => i.attempts >= MIN_ATTEMPTS && i.p_value !== null);
  const needsLook = graded
    .filter((i) => (i.p_value ?? 1) < 0.2 || (i.p_value ?? 0) > 0.95)
    .sort((a, b) => (a.p_value ?? 0) - (b.p_value ?? 0))
    .slice(0, 10);

  return (
    <AdminShell
      member={member}
      current="/dashboard"
      title="Dashboard"
      subtitle="Every answer any learner gives is one row. These panels are that data, nothing else."
    >
      <div className="space-y-5">
        {isDemoMember(member) && (
          <Empty>Signed in as the local demo admin, no real account.</Empty>
        )}

        {/* KPI row */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat
            label="Answers logged"
            value={totalAttempts.toLocaleString()}
            hint={`across ${answered.length} of ${items.length} questions`}
          />
          <Stat
            label="Overall accuracy"
            value={pct(accuracy)}
            hint={accuracy === null ? "no answers yet" : `${totalCorrect} correct`}
          />
          <Stat
            label="Learners seen"
            value={String(maxLearners)}
            hint="distinct devices in the busiest game"
          />
          <Stat
            label="Questions to look at"
            value={String(needsLook.length)}
            tone={needsLook.length > 0 ? "warning" : "good"}
            hint={`${MIN_ATTEMPTS}+ attempts and outside the usual range`}
          />
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <Panel
            title="Weekly activity"
            hint="Answers logged per week. Return rate is the number that matters, a flat line means kids play once and stop."
          >
            {weeks.length === 0 ? (
              <Empty>No answers logged yet. Play a game and refresh.</Empty>
            ) : (
              <Columns
                points={weeks.map((w) => ({
                  label: weekLabel(w.week),
                  value: w.events,
                  tooltip: `${weekLabel(w.week)}: ${w.events} answers · ${w.active_learners} learners · ${pct(
                    w.events > 0 ? w.correct / w.events : null,
                  )} correct`,
                }))}
                valueLabel="Answers per week, hover a column for learners and accuracy"
              />
            )}
          </Panel>

          <Panel
            title="Games"
            hint="How much each game is actually played, and how hard it turns out to be."
          >
            {gameStats.length === 0 ? (
              <Empty>No game has logged an answer yet.</Empty>
            ) : (
              <BarRows
                rows={gameStats.map((g) => ({
                  label: GAME_TITLES.get(g.game_slug) ?? g.game_slug,
                  value: g.events,
                  sub: `${pct(g.accuracy)} correct · ${g.learners} learner${
                    g.learners === 1 ? "" : "s"
                  } · ${g.items_touched} questions`,
                  tooltip: `${g.events} answers · median ${
                    g.median_latency_ms ? `${(g.median_latency_ms / 1000).toFixed(1)}s` : "-"
                  } to answer`,
                }))}
              />
            )}
          </Panel>
        </div>

        <Panel
          title="Questions to look at"
          hint={`Questions almost everyone gets wrong, or almost everyone gets right, once at least ${MIN_ATTEMPTS} learners have tried them. Worth a human look, not a verdict.`}
        >
          {needsLook.length === 0 ? (
            <Empty>
              {graded.length === 0
                ? `Nothing has ${MIN_ATTEMPTS} attempts yet. This stays empty until enough kids have played for the numbers to mean anything.`
                : `All ${graded.length} questions with enough data sit inside the healthy band.`}
            </Empty>
          ) : (
            <div className="-mx-5 overflow-x-auto px-5">
              <table className="w-full min-w-[36rem] text-left text-sm">
                <thead>
                  <tr className="border-b border-felt text-xs font-black uppercase tracking-wider text-wolf">
                    <th className="py-2 pr-3">Question</th>
                    <th className="py-2 pr-3">Game</th>
                    <th className="py-2 pr-3 text-right">Attempts</th>
                    <th className="py-2 pr-3 text-right">Correct</th>
                    <th className="py-2 pr-3 text-right">Median</th>
                    <th className="py-2">Read</th>
                  </tr>
                </thead>
                <tbody>
                  {needsLook.map((i) => {
                    const tooHard = (i.p_value ?? 1) < 0.2;
                    return (
                      <tr key={i.item_id} className="border-b border-felt/60 last:border-0">
                        <td className="py-2 pr-3 font-bold text-steppe">
                          {itemLabel(i.kind, i.payload, i.ref_slug)}
                          <span className="ml-2 text-xs font-semibold text-wolf/60">{i.kind}</span>
                        </td>
                        <td className="py-2 pr-3 font-semibold text-wolf">
                          {i.game_slug ? (GAME_TITLES.get(i.game_slug) ?? i.game_slug) : "shared"}
                        </td>
                        <td className="py-2 pr-3 text-right tabular-nums font-bold">{i.attempts}</td>
                        <td className="py-2 pr-3 text-right tabular-nums font-bold">{pct(i.p_value)}</td>
                        <td className="py-2 pr-3 text-right tabular-nums font-semibold text-wolf">
                          {i.median_latency_ms ? `${(i.median_latency_ms / 1000).toFixed(1)}s` : "-"}
                        </td>
                        <td className="py-2">
                          <StatusChip
                            tone={tooHard ? "critical" : "warning"}
                            label={tooHard ? "Rarely right" : "Always right"}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <div className="grid gap-5">
          <Panel
            title="Team pulse"
            hint="Tickets waiting on an answer, and in-app feedback from kids."
          >
            <div className="grid grid-cols-2 gap-4">
              <Stat
                label="Tickets in the inbox"
                value={String(tickets.filter((t) => t.status === "inbox").length)}
                tone={
                  tickets.filter((t) => t.status === "inbox").length > 0 ? "warning" : "good"
                }
                hint={`${tickets.length} filed in total`}
              />
              <Stat
                label="Feedback notes"
                value={String(feedback.length)}
                hint={
                  feedback.length > 0
                    ? `${feedback.filter((f) => f.kind === "bug").length} bugs · ${
                        feedback.filter((f) => f.kind === "idea").length
                      } ideas`
                    : "nothing sent yet"
                }
              />
            </div>
          </Panel>
        </div>
      </div>
    </AdminShell>
  );
}
