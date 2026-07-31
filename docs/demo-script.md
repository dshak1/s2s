# Demo script

Four minutes, screen recorded. The through-line: **the app now gets better
because people use it, and everyone can see their own fingerprints on it.**

Have ready: signed in as admin, a second browser profile signed in as a
non-staff member, a game played recently so the dashboard isn't empty.

---

**0:00 — Play one round.** `/play/greetings-quiz`. Answer two questions, one
right, one wrong. Say nothing clever; just play it.

> "Nothing about that looked different. But every one of those taps is now a row
> in the database — what was asked, what they picked, how long they hesitated,
> how many times they replayed the audio."

**0:30 — `/dashboard`.** Land on the KPI row, then scroll to **Questions to look
at**.

> "This is classical item analysis. Under 20% correct means the question is
> broken or we taught it wrong. Over 95% means it teaches nothing. We're not
> guessing which content is bad any more — the kids are telling us."

Point at coverage meters.

> "And this says exactly what's missing before a game is ready to ship."

**1:15 — `/ideas`.** Submit an idea live from the second browser profile.

> "Anyone on the team can put an idea here. It gets a real vote from a real
> person — not a number anyone can inflate by clearing their cache."

Switch to admin, click **Respond**, try to save with an empty reason — it
refuses. Then write a real one and save.

> "You cannot move an idea out of the inbox without saying why. That's not a
> team norm we agreed to and will forget in three weeks — it's a database
> constraint. The reason shows up on the card with your name on it."

If `LINEAR_API_KEY` is set: click **File in Linear**, show the issue appear, show
the link back on the card.

**2:15 — `/label`.** Open the queue.

> "This is the part I actually care about. The data can tell us a question is
> hard. It can't tell us the recording says the word wrong, or that the wrong
> answers give it away, or that nobody actually says it like that in Kazakh.
> Only the people in this room can."

Rate the five axes. Hit **Say it instead** and talk for ten seconds about a
pronunciation problem — show the transcript land in the box.

> "You don't have to type. Say it out loud and it writes it down."

Scroll to **Who's labelling**.

> "Every judgement is credited. This is the record of who built the dataset."

**3:15 — The point.**

> "Meta turned everyone into free data labellers for products they don't own.
> We're doing the opposite: we own this one. Learner interaction data plus
> expert judgements from actual native speakers and educators, on the same
> items, for a language almost nobody has this for.
>
> That's not just how we fix our own questions. It's a benchmark — can a model
> judge Kazakh learning content as well as the people in this room? Nobody can
> answer that today because nobody has the data. In a few workshops, we will."

**3:45 — Ask.** Sign in, pick a role, do twenty labels.

---

## Notes

- Do the failed decision-note save. The refusal is the most convincing three
  seconds in the demo.
- Don't claim numbers the dashboard doesn't show. If there are 4 events in
  there, say so and say what it looks like at 4,000.
- If the transcript comes back wrong, leave it in and point out that the audio
  is saved either way. Fixing it live is a better demo than a clean take.
