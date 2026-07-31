# Security

## The model

Anonymous kids write. Only signed-in team members read across rows.

Enforced in two independent places:

1. **RLS**, which is the real boundary. Every gameplay table grants anon
   `insert` and `update` only; `select` requires `is_team()`.
2. **`requireTeam()` / `requireStaff()`** in server components and route
   handlers, which produce a decent redirect instead of an empty page.

If the guard were removed tomorrow, the data would still be protected. That is
the intended relationship between the two.

## What changed, and why it mattered

`0001_init.sql` shipped `for all using (true)` on `profiles`, `sessions`,
`attendance`, `kid_artifacts`, `game_runs`, and `profile_badges`. The anon key is
public by design — it ships in the JavaScript bundle. Anyone who opened dev tools
could read every kid's profile and every game run.

`0005_identity.sql` replaced those policies. Verified against the live project
with the real anon key: `profiles` and `game_runs` return `[]`, inserts still
return 201, reference data (`vocab`, `badges`) still reads.

The same migration added the `storage.objects` policies for the `kid-art` bucket
that `0001` never created — which is why `syncArtifact` and `syncHomework` had
been silently swallowing every upload (both helpers `return` on error).

## Known gaps

These are real and deliberately not yet closed. They are listed here rather than
quietly ignored.

**Anon can still write junk.** Any holder of the anon key can insert arbitrary
rows into `learning_events`, `profiles`, `game_runs`. There is no rate limit and
no server-side validation. The fix is a server-side ingest route with Vercel
BotID or a rate limit in front of it. Until then the data is trustworthy for a
supervised workshop and would not be trustworthy on the open internet.

**Anon can update any row it can guess the id of.** The update policies are
`using (true)` because an anonymous kid has no verifiable identity to scope to.
Row ids are v4 UUIDs generated on-device, so this needs the id, but it is not
protection — it is obscurity. Same fix as above.

**`kid-art` is a public bucket.** Anyone with a path can fetch a child's drawing
or homework photo. Paths contain a random profile id and a random artifact id, so
they are not enumerable, but the bucket should become private with signed URLs
before anything is shared outside the workshop.

**Voice notes are private but unencrypted at rest** beyond Supabase's own
storage encryption. They contain team members' opinions, not learner data.

**`decision_note` on the Linear webhook path.** The webhook refuses to change an
idea's status if there is no decision note, because the CHECK constraint would
reject it — but that means a Linear state change can silently do nothing. It
returns `{ ignored: "no decision note" }` rather than failing loudly.

## Reporting

Found something? Tell Diar directly rather than filing it on the public idea
board.
