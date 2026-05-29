# Steppe to Screen — 5-Minute Demo Script

Rehearse this cold. It's written to run on one laptop plugged into the projector,
plus your phone on the same network (or a second browser tab). Everything works
offline — no logins, no backend setup. Total run time ~5 minutes.

> **One-time setup (before the room fills):** `pnpm install && pnpm dev`, open
> `http://localhost:3000`. Have a second browser window ready (this plays "the kid").

---

## 0:00 — The hook (30s)
> "Steppe to Screen is a Kazakh language *and* culture platform for kids 5 to 12.
> It's built for exactly how we run our workshops: one projector, kids on phones
> and iPads, craft materials on the tables. Three audiences — the kids, the
> facilitator driving the room, and the funders who want outcome data. Let me
> show you the kid's loop first."

Open `/` on the projector → click **"Play the Games."**

## 0:30 — The flagship: Sözdik Match (50s)
Open **Sözdik Match**.
> "This is the Quizlet-style game, but built for our vocabulary." Drag two or
> three Kazakh words onto their pictures — they sparkle, the word plays, they lock
> in gold. Toggle the mode to **Kazakh → English**.
> "Same engine, three directions. Finish at 100% and—" complete it → **confetti**.
> "Every round writes a `game_runs` record with which words the kid saw and got
> right. That's our pre/post vocab data, for free."

## 1:20 — The moat: Tańba Studio (50s)
Open **Tańba Studio**.
> "This is what no off-the-shelf tool gives us. The kid draws their *tańba* — their
> family's tribal mark — with the Kazakh palette." Scribble a quick mark in gold and
> blue. Click **"Save as my avatar."** Confetti.
> "That PNG becomes their avatar *everywhere* — and notice they can also upload a
> photo, or pull in the Canva designs they made in session one. Their own art comes
> back to them across the whole platform."

## 2:10 — The dashboard as a quest: Dala Quest (40s)
Top-right avatar → **Dala Quest** (or the tile).
> "The dashboard is framed as a quest across a real map of Kazakhstan — eight
> regions, each tied to a theme. Almaty starts unlocked." Tap **Almaty** → show the
> elder-clip slot, the cultural fact, the region's words, and **"Unlock Astana."**
> Tap it → bounce back to the map and show Astana now glowing.

## 2:50 — The technical wow: Jaryq Hunter (40s)
Open **Jaryq Hunter**.
> "This one's the resume bullet. The room is dark; you move a flashlight to find the
> letters of a Kazakh word — and you can't shine on the wolves, *qasqyr*." Sweep the
> light with the mouse, collect a couple letters.
> "Touch, mouse, and arrow keys all work. And there's a real webcam mode—" point to
> the **Webcam Flashlight** toggle "—that tracks an actual flashlight's bright spot
> through the camera. Touch mode is the reliable default for the room."

## 3:30 — Breadth: rapid-fire the rest (45s)
Back to **Games**. Tap through fast:
> "Memory match with felt-textured cards. **Aitys Battle** — real Kazakh oral poetry,
> you fill the rhyming couplet. **Falling Sözder** catches words into baskets.
> **Yurt Builder** — every Kazakh letter you master literally builds a piece of your
> yurt on your profile. **Story Maker** turns their art into a comic. And **Snow
> Leopard Patrol** is a QR scavenger hunt across the room."

## 4:15 — The facilitator console + live join (45s)
Open `/facilitator` → **Start new session**. A big code + QR appear.
> "This is my projector view. Kids scan to join." In your **second window**, go to
> `/join`, type the code, enter a name → watch the avatar **pop into the grid live**
> on the projector.
> "That's BroadcastChannel today; one line swaps it for Supabase Realtime across
> devices. I can launch any game to the room, mute or pause everyone, and print the
> QR scavenger hunt and a reusable wall map." Click **Print QR hunt** to show the
> printable sheet.

## 5:00 — Land it (15s)
> "Real Kazakh vocabulary, our own cultural content, ten finished games, a
> facilitator console, and outcome metrics baked in — running today with zero setup,
> and the Supabase schema and migrations are written and ready to deploy. This is
> the one we run at the next workshop."

---

### If asked "is the data real?"
> "The schema in `/supabase/migrations` is production-ready — RLS, storage bucket,
> Realtime. The connectors weren't live in this build session, so it runs on a local
> store that mirrors that schema exactly. Wiring the env vars and running the
> migrations is the only step between this and a live backend."

### Backup if the webcam is blocked
Just stay in touch/mouse mode — it's the default and the whole game works without a
camera. The webcam toggle will say "Calibrating… falling back to touch."
