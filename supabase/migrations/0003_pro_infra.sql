-- Pro infrastructure: wishlist + feedback tables

create table if not exists wishlist_items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  submitted_by text not null default 'Team',
  priority text not null default 'p2' check (priority in ('p1', 'p2', 'p3')),
  status text not null default 'idea' check (status in ('idea', 'planned', 'building', 'shipped', 'wont-do')),
  votes int not null default 0,
  category text default 'feature' check (category in ('feature', 'bug', 'content', 'ux')),
  created_at timestamptz not null default now()
);

create table if not exists feedback_items (
  id uuid primary key default gen_random_uuid(),
  message text not null,
  kind text not null default 'general' check (kind in ('bug', 'idea', 'love', 'confusion', 'general')),
  page_url text,
  profile_id uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table wishlist_items enable row level security;
alter table feedback_items enable row level security;

create policy "wishlist select" on wishlist_items for select using (true);
create policy "wishlist insert" on wishlist_items for insert with check (true);
create policy "wishlist update votes" on wishlist_items for update using (true) with check (true);
create policy "feedback insert" on feedback_items for insert with check (true);
create policy "feedback select" on feedback_items for select using (true);

-- Starter wishlist items from the strategic plan
insert into wishlist_items (title, description, submitted_by, priority, category, votes) values
  ('Audio recordings for every vocab word', 'Tap any card to hear the Kazakh pronunciation. Blocks Sound It Out being fully playable.', 'Build team', 'p1', 'content', 5),
  ('Parent weekly progress email', 'Automatic email every Sunday: XP gained, badges earned, next stop on the Silk Road.', 'Workshop team', 'p1', 'feature', 4),
  ('Kid-to-kid table leaderboard', 'Show top 3 per table on the facilitator live view. Social motivation.', 'Facilitator', 'p2', 'feature', 3),
  ('Printable PDF certificate per kid', 'At end of each workshop, print a certificate with name, XP, badges. Already built!', 'Build team', 'p1', 'feature', 3),
  ('AI-generated vocab illustrations', 'Generate missing word images with DALL-E/Imagen. Unblocks adding new vocab.', 'Build team', 'p2', 'content', 2),
  ('Admin: rotate weekly code from phone', 'Facilitator should not need a laptop to set the week code. Mobile-optimised input.', 'Facilitator', 'p2', 'ux', 2),
  ('Add Sentry error monitoring', 'pnpm add @sentry/nextjs + set NEXT_PUBLIC_SENTRY_DSN. Stub already in src/lib/monitoring.ts.', 'Build team', 'p1', 'feature', 2),
  ('Service worker / offline caching', 'Cache game assets so the app works in the gym with spotty Wi-Fi.', 'Build team', 'p2', 'feature', 1),
  ('Replay XP weekly cap', 'Prevent grinding: max 200 XP per game per week. Keeps leaderboard fair.', 'Build team', 'p3', 'feature', 1),
  ('Real rhyming Kazakh couplets for Aitys Battle', 'Current couplets do not rhyme. Needs a Kazakh language expert review.', 'Content team', 'p2', 'content', 1)
on conflict do nothing;
