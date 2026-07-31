# Backlog

Everything built so far, and everything still to do. Each open item also exists
as a real ticket on `/tickets`, filed under Diar, so this doc and the board do
not drift.

Last updated 2026-07-31.

## Shipped

### Foundation
- Team accounts by magic link. First person to sign in becomes admin, everyone
  after lands as `pending` with zero access until approved.
- RLS rewritten. The anon key ships in the JavaScript bundle, and until this
  week every gameplay table was readable by anyone who opened dev tools.
  Anonymous devices now write only; reads across rows are team only.
- Storage policies that were missing since the first migration, which is why
  every artwork and homework upload had been silently failing.
- `content_items`: 142 questions with stable derived ids like `vocab:ake:v1`.
- `learning_events`: one row per answer, wired into all ten question-asking
  games, queued in localStorage so a round on gym wifi survives a reload.
- Analytics views for item difficulty, per-game accuracy, weekly activity.

### Surfaces
- `/dashboard`: item analysis, weekly activity, per-game accuracy, questions to
  look at.
- `/tickets`: three types (bug, request, flagged question), human refs like
  S2S-14, votes tied to real people, comments, attachments, and a decision note
  the database refuses to let you skip.
- `/label`: labelling queue ordered by signal, five-axis rubric, required
  reasons on rejection, gold-standard checks, voice notes transcribed by
  ElevenLabs Scribe, per-rater credit.
- `/admin/team`: approvals, roles, expertise.
- `/login`: magic link, with a real "waiting for approval" screen.

### Decisions that stuck
- Three permission states (pending, member, admin) instead of six roles that
  all meant the same thing. Expertise is a separate descriptive field that
  grants nothing, kept because attributing a rating to a native speaker is the
  basis of the research.
- Internal tools do not wear the kids theme. The ticket screen is the reference
  for the rest.
- No em dashes in anything a person reads.

### Also done
- Linear sync code, gated on an API key.
- Nine docs in the repo, six pages mirrored to Notion.
- Deployed to production four times.

## Open

Grouped by what they unlock. Every line is a ticket on `/tickets`.

### Ticket board, finish the job
The board is usable but half the workflow is missing.

- Statuses become planned / in progress / closed, with a resolution on close.
- Request a reviewer, email them, review stays open until closed, track who
  asked and who closed it.
- Anyone with dashboard access can edit any ticket, with an edit history.
- Urgency as an optional tag rather than P0/P1/P2 jargon.
- Fix: saving a decision with one empty field wipes the other.
- Fix: "try the draft" ships a 404 when no draft exists.
- Likes on comments. Image attachments rendered on the card.
- Mirror every ticket into the Obsidian vault as markdown.

### Permissions and people
- Level-based permissions. You can approve at or below your own level, never
  above, and never touch someone above you.
- Verify educators against a known email and phone list from the group chat, so
  they skip the pending queue.
- Educators can see homework and mark it complete. Decide student visibility
  first.
- Email when someone is waiting for approval.

### Labelling, make it fast and make it close the loop
- Keyboard first: Y for good, N for bad, next item immediately.
- A rejected question goes back through the AI and returns to the queue as a
  reworked draft. Without this, labelling marks problems instead of fixing them.
- Flag audio from inside the game, carrying the question id with it.
- Screenshot drag and drop in the feedback widget.

### The loop worth demoing
- Feedback lands in a queue. A human kicks off evaluation, so a thousand kid
  submissions cannot burn the AI budget.
- The AI drafts a fix, deploys a preview, tags a reviewer, emails them. Reviewer
  tries it on their phone, talks at it, loop closes.
- Content generation that emits explicit uncertainty flags. The taxonomy and the
  UI exist; the generator does not.

### Design
- Dashboard and labelling adopt the ticket screen style.
- Set up a shadcn component registry. Real components instead of hand-rolled
  divs, and the actual fix for everything looking the same.
- The app itself still looks rough. Needs a visual reference to work from.

### Product and content
- Custom backgrounds do not persist. They live in localStorage and never sync.
- Unhide the remaining six games against a written quality bar.
- Real kid artist names instead of "User 1-6".
- Remove the contest credit from Spotlight Panic.
- PWA hardening: offline caching, real icons, install prompt.
- Maze results import and in-app survey triggers.
- Dataset export and inter-rater agreement.
- Contributor credits page.
- Sentry.

## Not doing

- A separate React Native app. All eleven games are web canvas and DOM; a
  native rewrite forks the thing that works.
- Personalisation before checking whether expert labels actually predict learner
  outcomes. Ordering by an unvalidated model is theatre.
- More ticket types. Bug, request and flagged question cover it. A game bug is a
  bug with a game attached.
