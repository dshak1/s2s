import { requireTeam, type TeamMember } from "@/lib/auth";
import { getSupabaseServer } from "@/lib/supabase/server";
import { AdminShell, Empty, Panel } from "@/components/admin/shell";
import { Stat } from "@/components/admin/viz";
import {
  KIND_LABELS,
  VERIFY_ITEMS,
  VERIFY_TOTAL,
  dealFor,
  verifyItem,
} from "@/lib/verify-items";
import { reopenVerification } from "./actions";
import { VerifyQueue } from "./queue";

export const metadata = { title: "Verify · Steppe to Screen" };
export const dynamic = "force-dynamic";

type Review = {
  item_id: string;
  kind: string;
  verdict: "approved" | "needs_work";
  comment: string | null;
  reviewed_by: string;
  reviewed_at: string;
};

type ReviewerStat = {
  reviewed_by: string;
  reviewed: number;
  approved: number;
  needs_work: number;
};

export default async function VerifyPage() {
  const member = await requireTeam(undefined, "/verify");
  const sb = await getSupabaseServer();

  if (!sb) {
    return (
      <AdminShell member={member} current="/verify" title="Verify the questions">
        <Empty>Offline demo mode. Verification records need Supabase.</Empty>
      </AdminShell>
    );
  }

  const [reviewsRes, statsRes, teamRes] = await Promise.all([
    sb
      .from("question_verifications")
      .select("item_id, kind, verdict, comment, reviewed_by, reviewed_at")
      .order("reviewed_at", { ascending: false }),
    sb.from("v_verification_stats").select("*").order("reviewed", { ascending: false }),
    sb.from("team_members").select("id, display_name"),
  ]);

  const reviews = (reviewsRes.data ?? []) as Review[];
  const stats = (statsRes.data ?? []) as ReviewerStat[];
  const names = new Map(
    ((teamRes.data ?? []) as Array<Pick<TeamMember, "id" | "display_name">>).map((t) => [
      t.id,
      t.display_name,
    ]),
  );

  const byItem = new Map(reviews.map((review) => [review.item_id, review]));
  const pending = VERIFY_ITEMS.filter((item) => !byItem.has(item.id));
  const flagged = reviews.filter((review) => review.verdict === "needs_work");
  const mine = stats.find((stat) => stat.reviewed_by === member.id);
  const isStaff = member.role === "admin";

  const groups = [...new Set(VERIFY_ITEMS.map((item) => item.group))];

  return (
    <AdminShell
      member={member}
      current="/verify"
      title="Verify the questions"
      subtitle="Every clip and every translation, listened to once by one person. Approving takes one key."
    >
      <div className="mx-auto max-w-3xl space-y-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <Stat
            label="You verified"
            value={String(mine?.reviewed ?? 0)}
            hint={mine ? `${mine.needs_work} sent back for a fix` : "no cap — do as many as you want"}
          />
          <Stat
            label="Team coverage"
            value={`${reviews.length}/${VERIFY_TOTAL}`}
            hint="one review each is the whole bar"
          />
          <Stat label="Waiting" value={String(pending.length)} hint="nobody has heard these yet" />
        </div>

        <VerifyQueue
          deck={dealFor(member.id, pending)}
          total={VERIFY_TOTAL}
          reviewedByTeam={reviews.length}
        />

        <Panel
          title={`Sent back for a fix (${flagged.length})`}
          hint="Someone heard a problem. Fix the content, then reopen the item so a second pair of ears confirms it."
        >
          {flagged.length === 0 ? (
            <Empty>Nothing flagged. Either it is all good or nobody has listened yet.</Empty>
          ) : (
            <ul className="space-y-3">
              {flagged.map((review) => {
                const item = verifyItem(review.item_id);
                return (
                  <li
                    key={review.item_id}
                    className="border-b border-[#eef1f5] pb-3 last:border-0 last:pb-0"
                  >
                    <div className="flex flex-wrap items-baseline gap-2">
                      <span className="text-[15px] font-semibold">
                        {item?.kk ?? review.item_id}
                      </span>
                      <span className="text-[12px] text-[#94a3b8]">
                        {item ? `${KIND_LABELS[item.kind]} · ${item.group}` : review.kind}
                      </span>
                      {isStaff && (
                        <form action={reopenVerification} className="ml-auto">
                          <input type="hidden" name="item_id" value={review.item_id} />
                          <button
                            type="submit"
                            className="rounded-md border border-[#dbe0e6] px-2 py-1 text-[12px] font-medium text-[#475569] transition hover:bg-[#f1f3f6]"
                          >
                            Reopen
                          </button>
                        </form>
                      )}
                    </div>
                    <p className="mt-1 text-[13px] leading-relaxed text-[#334155]">
                      “{review.comment}”
                    </p>
                    <p className="mt-1 text-[12px] text-[#94a3b8]">
                      {names.get(review.reviewed_by) ?? "Team member"} ·{" "}
                      {new Date(review.reviewed_at).toLocaleDateString()}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        <Panel
          title="Who has covered what"
          hint="Split it however suits the week — the list is done when the count is."
        >
          {stats.length === 0 ? (
            <Empty>Nobody has verified anything yet. Be first.</Empty>
          ) : (
            <ul className="space-y-2">
              {stats.map((stat) => (
                <li
                  key={stat.reviewed_by}
                  className="flex items-center justify-between gap-3 border-b border-[#eef1f5] pb-2 text-[13px] last:border-0 last:pb-0"
                >
                  <span className="font-medium">
                    {names.get(stat.reviewed_by) ?? "Team member"}
                    {stat.reviewed_by === member.id && (
                      <span className="ml-2 text-[12px] text-[#94a3b8]">(you)</span>
                    )}
                  </span>
                  <span className="tabular-nums">
                    {stat.reviewed}
                    <span className="ml-2 text-[12px] text-[#94a3b8]">
                      {stat.approved} approved · {stat.needs_work} flagged
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel
          title={`The whole checklist (${VERIFY_TOTAL})`}
          hint="Everything the games ask, and who has signed off on it."
        >
          <div className="space-y-2">
            {groups.map((group) => {
              const items = VERIFY_ITEMS.filter((item) => item.group === group);
              const left = items.filter((item) => !byItem.has(item.id)).length;
              return (
                <details key={group} className="rounded-md border border-[#eef1f5]">
                  <summary className="flex cursor-pointer items-center gap-2 px-3 py-2 text-[13px]">
                    <span className="font-medium">{group}</span>
                    <span className="text-[12px] text-[#94a3b8]">
                      {items.length - left}/{items.length} done
                    </span>
                  </summary>
                  <ul className="border-t border-[#eef1f5] px-3 py-2">
                    {items.map((item) => {
                      const review = byItem.get(item.id);
                      return (
                        <li
                          key={item.id}
                          className="flex items-baseline gap-2 py-1 text-[13px] leading-relaxed"
                        >
                          <span
                            className={
                              review?.verdict === "needs_work"
                                ? "text-[#c8102e]"
                                : review
                                  ? "text-[#1c7a4a]"
                                  : "text-[#cbd5e1]"
                            }
                          >
                            {review?.verdict === "needs_work" ? "!" : review ? "✓" : "·"}
                          </span>
                          <span className="min-w-0 truncate font-medium">{item.kk}</span>
                          {item.en && (
                            <span className="min-w-0 truncate text-[#94a3b8]">{item.en}</span>
                          )}
                          {review && (
                            <span className="ml-auto shrink-0 text-[12px] text-[#94a3b8]">
                              {names.get(review.reviewed_by) ?? "Team member"}
                            </span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </details>
              );
            })}
          </div>
        </Panel>
      </div>
    </AdminShell>
  );
}
