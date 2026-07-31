import { ChevronUp, ExternalLink, Lightbulb, MessageSquare } from "lucide-react";
import { requireTeam, STAFF_ROLES, type TeamMember } from "@/lib/auth";
import { getSupabaseServer } from "@/lib/supabase/server";
import { linearEnabled } from "@/lib/linear";
import { TeamNav } from "@/components/dashboard/team-nav";
import { EmptyNote } from "@/components/dashboard/viz";
import { addComment, addLink, toggleVote } from "./actions";
import { DecisionForm, ImageAttachment, NewIdeaForm, PushToLinearButton } from "./forms";

export const metadata = { title: "Ideas · Steppe to Screen" };
export const dynamic = "force-dynamic";

type Idea = {
  id: string;
  title: string;
  description: string | null;
  submitted_by: string;
  author_id: string | null;
  status: "idea" | "planned" | "building" | "shipped" | "wont-do";
  category: "feature" | "bug" | "content" | "ux";
  votes: number;
  decision_note: string | null;
  decided_by: string | null;
  decided_at: string | null;
  preview_url: string | null;
  linear_issue_url: string | null;
  linear_issue_id: string | null;
  created_at: string;
};

type Comment = {
  id: string;
  idea_id: string;
  author_id: string | null;
  body: string;
  created_at: string;
};

type Attachment = {
  id: string;
  idea_id: string;
  kind: "image" | "link";
  storage_path: string | null;
  url: string | null;
  title: string | null;
};

const STATUS_META: Record<Idea["status"], { label: string; className: string }> = {
  idea: { label: "💡 Not answered yet", className: "bg-felt text-wolf" },
  planned: { label: "📋 Planned", className: "bg-steppe/10 text-steppe" },
  building: { label: "🔨 Building", className: "bg-gold/20 text-steppe-700" },
  shipped: { label: "✅ Shipped", className: "bg-green-100 text-green-700" },
  "wont-do": { label: "❌ Not doing this", className: "bg-red-50 text-red-500" },
};

const CATEGORY_META: Record<Idea["category"], string> = {
  feature: "✨ Feature",
  bug: "🐛 Bug",
  content: "📚 Content",
  ux: "🎨 UX/Design",
};

const FILTERS = ["all", "idea", "planned", "building", "shipped", "wont-do"] as const;

function publicImageUrl(path: string): string {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/idea-attachments/${path}`;
}

export default async function IdeasPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const member = await requireTeam(undefined, "/ideas");
  const { filter = "all" } = await searchParams;
  const sb = await getSupabaseServer();
  const isStaff = STAFF_ROLES.includes(member.role);

  if (!sb) {
    return (
      <div className="min-h-dvh bg-warm font-admin">
        <TeamNav member={member} current="/ideas" />
        <main className="mx-auto max-w-4xl px-4 py-8">
          <EmptyNote>Offline demo mode — the idea board needs Supabase.</EmptyNote>
        </main>
      </div>
    );
  }

  const [ideasRes, votesRes, commentsRes, attachmentsRes, teamRes] = await Promise.all([
    sb
      .from("wishlist_items")
      .select("*")
      .order("votes", { ascending: false })
      .order("created_at", { ascending: false }),
    sb.from("idea_votes").select("idea_id").eq("voter_id", member.id),
    sb.from("idea_comments").select("*").order("created_at", { ascending: true }),
    sb.from("idea_attachments").select("*"),
    sb.from("team_members").select("id, display_name"),
  ]);

  const ideas = (ideasRes.data ?? []) as Idea[];
  const myVotes = new Set(((votesRes.data ?? []) as Array<{ idea_id: string }>).map((v) => v.idea_id));
  const comments = (commentsRes.data ?? []) as Comment[];
  const attachments = (attachmentsRes.data ?? []) as Attachment[];
  const names = new Map(
    ((teamRes.data ?? []) as Array<Pick<TeamMember, "id" | "display_name">>).map((t) => [
      t.id,
      t.display_name,
    ]),
  );

  const visible = filter === "all" ? ideas : ideas.filter((i) => i.status === filter);
  const unanswered = ideas.filter((i) => i.status === "idea").length;
  const answeredPct =
    ideas.length > 0 ? Math.round(((ideas.length - unanswered) / ideas.length) * 100) : 0;

  return (
    <div className="min-h-dvh bg-warm font-admin">
      <TeamNav member={member} current="/ideas" />

      <main className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-steppe">Ideas</h1>
            <p className="mt-1 text-sm font-semibold text-wolf">
              {ideas.length} idea{ideas.length === 1 ? "" : "s"} · {answeredPct}% have an
              answer{unanswered > 0 && ` · ${unanswered} still waiting`}
            </p>
          </div>
          <NewIdeaForm />
        </div>

        <div className="mb-5 flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <a
              key={f}
              href={f === "all" ? "/ideas" : `/ideas?filter=${f}`}
              className={`rounded-full px-3 py-1.5 text-xs font-black transition ${
                filter === f ? "bg-steppe text-white" : "bg-white text-wolf hover:bg-felt"
              }`}
            >
              {f === "all" ? "All" : STATUS_META[f].label}
            </a>
          ))}
        </div>

        {visible.length === 0 ? (
          <div className="rounded-2xl bg-white py-16 text-center text-wolf shadow">
            <Lightbulb size={40} className="mx-auto mb-3 opacity-30" />
            <p className="font-bold">Nothing here. Add the first idea.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {visible.map((idea) => {
              const voted = myVotes.has(idea.id);
              const meta = STATUS_META[idea.status];
              const mine = comments.filter((c) => c.idea_id === idea.id);
              const files = attachments.filter((a) => a.idea_id === idea.id);

              return (
                <article
                  key={idea.id}
                  className="rounded-2xl bg-white p-4 shadow ring-1 ring-black/5"
                >
                  <div className="flex gap-4">
                    <form action={toggleVote}>
                      <input type="hidden" name="idea_id" value={idea.id} />
                      <input type="hidden" name="voted" value={voted ? "1" : "0"} />
                      <button
                        type="submit"
                        title={voted ? "Remove your vote" : "Vote for this"}
                        className={`flex flex-col items-center rounded-xl px-3 py-2 transition ${
                          voted
                            ? "bg-gold/20 text-steppe-700"
                            : "bg-felt text-wolf hover:bg-gold/20 hover:text-steppe-700"
                        }`}
                      >
                        <ChevronUp size={18} />
                        <span className="text-sm font-black">{idea.votes}</span>
                      </button>
                    </form>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start gap-2">
                        <h2 className="font-black text-steppe">{idea.title}</h2>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-black ${meta.className}`}
                        >
                          {meta.label}
                        </span>
                        <span className="rounded-full bg-felt px-2 py-0.5 text-[10px] font-bold text-wolf">
                          {CATEGORY_META[idea.category]}
                        </span>
                      </div>

                      {idea.description && (
                        <p className="mt-1 text-sm font-semibold text-wolf">{idea.description}</p>
                      )}

                      <p className="mt-1 text-xs text-wolf/60">
                        by {idea.author_id ? (names.get(idea.author_id) ?? idea.submitted_by) : idea.submitted_by} ·{" "}
                        {new Date(idea.created_at).toLocaleDateString()}
                      </p>

                      {/* The response loop: the reason is as prominent as the status. */}
                      {idea.decision_note && (
                        <div className="mt-3 rounded-xl border-l-4 border-steppe bg-warm p-3">
                          <p className="text-xs font-black uppercase tracking-wider text-wolf">
                            Why · {idea.decided_by ? (names.get(idea.decided_by) ?? "team") : "team"}
                            {idea.decided_at &&
                              ` · ${new Date(idea.decided_at).toLocaleDateString()}`}
                          </p>
                          <p className="mt-1 text-sm font-semibold text-steppe">
                            {idea.decision_note}
                          </p>
                        </div>
                      )}

                      {(idea.preview_url || idea.linear_issue_url) && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {idea.preview_url && (
                            <a
                              href={idea.preview_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 rounded-full bg-gold/20 px-3 py-1.5 text-xs font-black text-steppe-700 hover:brightness-95"
                            >
                              <ExternalLink size={12} /> Try the draft
                            </a>
                          )}
                          {idea.linear_issue_url && (
                            <a
                              href={idea.linear_issue_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 rounded-full bg-felt px-3 py-1.5 text-xs font-black text-wolf hover:bg-steppe/10"
                            >
                              <ExternalLink size={12} /> Linear
                            </a>
                          )}
                        </div>
                      )}

                      {/* Inspiration: what it should look like, and links to prior art. */}
                      {files.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {files.map((f) =>
                            f.kind === "image" && f.storage_path ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                key={f.id}
                                src={publicImageUrl(f.storage_path)}
                                alt={f.title ?? "attachment"}
                                className="h-24 w-24 rounded-lg object-cover ring-1 ring-black/10"
                              />
                            ) : (
                              <a
                                key={f.id}
                                href={f.url ?? "#"}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 rounded-lg bg-felt px-3 py-2 text-xs font-bold text-wolf hover:bg-steppe/10"
                              >
                                <ExternalLink size={12} /> {f.title ?? f.url}
                              </a>
                            ),
                          )}
                        </div>
                      )}

                      {mine.length > 0 && (
                        <ul className="mt-3 space-y-2 border-t border-felt pt-3">
                          {mine.map((c) => (
                            <li key={c.id} className="text-sm">
                              <span className="font-black text-steppe">
                                {c.author_id ? (names.get(c.author_id) ?? "Team") : "Team"}
                              </span>{" "}
                              <span className="font-semibold text-wolf">{c.body}</span>
                            </li>
                          ))}
                        </ul>
                      )}

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <form action={addComment} className="flex min-w-[16rem] flex-1 gap-2">
                          <input type="hidden" name="idea_id" value={idea.id} />
                          <input
                            name="body"
                            required
                            placeholder="Add a comment…"
                            className="min-w-0 flex-1 rounded-full border-2 border-felt bg-warm px-3 py-1.5 text-sm font-semibold outline-none focus:border-steppe"
                          />
                          <button
                            type="submit"
                            className="inline-flex items-center gap-1 rounded-full bg-felt px-3 py-1.5 text-xs font-black text-wolf hover:bg-steppe/10"
                          >
                            <MessageSquare size={12} /> Post
                          </button>
                        </form>
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <form action={addLink} className="flex min-w-[16rem] flex-1 gap-2">
                          <input type="hidden" name="idea_id" value={idea.id} />
                          <input
                            name="url"
                            required
                            placeholder="Link to something similar…"
                            className="min-w-0 flex-1 rounded-full border-2 border-felt bg-warm px-3 py-1.5 text-sm font-semibold outline-none focus:border-steppe"
                          />
                          <button
                            type="submit"
                            className="rounded-full bg-felt px-3 py-1.5 text-xs font-black text-wolf hover:bg-steppe/10"
                          >
                            Add link
                          </button>
                        </form>
                        <ImageAttachment ideaId={idea.id} />
                      </div>

                      {isStaff && (
                        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-felt pt-3">
                          <DecisionForm
                            ideaId={idea.id}
                            currentStatus={idea.status}
                            currentNote={idea.decision_note}
                            currentPreview={idea.preview_url}
                          />
                          {linearEnabled() && !idea.linear_issue_id && idea.status !== "idea" && (
                            <PushToLinearButton ideaId={idea.id} />
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        <p className="mt-8 text-xs font-semibold text-wolf/70">
          Every idea gets an answer with a reason — that rule is enforced by the database,
          not by good intentions. {linearEnabled() ? "Linear sync is on." : "Set LINEAR_API_KEY to file accepted ideas into Linear."}
        </p>
      </main>
    </div>
  );
}
