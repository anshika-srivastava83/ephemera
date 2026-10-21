-- ==========================================================
-- EPHEMERA: SUPABASE FULL MIGRATION & DATA IMPORT SCRIPT
-- Run this in your Supabase Project -> SQL Editor
-- ==========================================================

-- 1. EXTENSIONS
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- 2. TABLES
create table if not exists public.events (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  location text,
  scheduled_at timestamptz,
  owner_id uuid not null,
  owner_email text,
  status text not null default 'open',
  max_submissions integer not null default 500,
  chosen_layout_id text,
  chosen_layout_ids text[] not null default '{}',
  final_wall_image_url text,
  created_at timestamptz not null default now()
);

-- Ensure owner_email column exists if events was already created
alter table public.events add column if not exists owner_email text;

-- Ensure event_collaborators has the right schema (drop old table if email column is missing):
do $$
begin
  if not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' and table_name = 'event_collaborators' and column_name = 'email'
  ) then
    drop table if exists public.event_collaborators cascade;
  end if;
end $$;

create table if not exists public.event_collaborators (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid not null references public.events(id) on delete cascade,
  email text not null,
  role text not null default 'collaborator', -- 'host' or 'collaborator'
  added_at timestamptz not null default now(),
  added_by text,
  constraint event_collaborators_event_email_unique unique (event_id, email)
);

create index if not exists idx_event_collaborators_email on public.event_collaborators (lower(email));
create index if not exists idx_event_collaborators_event on public.event_collaborators (event_id);

create table if not exists public.submissions (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid not null references public.events(id) on delete cascade,
  phone_hash text not null,
  caption text not null check (char_length(caption) <= 120),
  photo_url text not null,
  polaroid_url text not null,
  status text not null default 'pending',
  reuse_consent boolean not null default false,
  position_seed int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists submissions_event_phone_unique
  on public.submissions (event_id, phone_hash);

create index if not exists submissions_event_status_idx
  on public.submissions (event_id, status);

create table if not exists public.submission_contacts (
  submission_id uuid primary key references public.submissions(id) on delete cascade,
  email text not null,
  access_token uuid not null default uuid_generate_v4() unique,
  created_at timestamptz not null default now()
);

-- 3. ROW LEVEL SECURITY (RLS)
alter table public.events enable row level security;
alter table public.event_collaborators enable row level security;
alter table public.submissions enable row level security;
alter table public.submission_contacts enable row level security;

-- Policies for events
drop policy if exists "Anyone can read events" on public.events;
create policy "Anyone can read events" on public.events for select using (true);

drop policy if exists "Service role full access on events" on public.events;
create policy "Service role full access on events" on public.events for all using (true) with check (true);

-- Policies for event_collaborators
drop policy if exists "Anyone can read event collaborators" on public.event_collaborators;
create policy "Anyone can read event collaborators" on public.event_collaborators for select using (true);

drop policy if exists "Service role full access on event_collaborators" on public.event_collaborators;
create policy "Service role full access on event_collaborators" on public.event_collaborators for all using (true) with check (true);

-- Policies for submissions
drop policy if exists "Anyone can read approved submissions" on public.submissions;
create policy "Anyone can read approved submissions" on public.submissions for select using (status = 'approved');

drop policy if exists "Anyone can submit guest photographs" on public.submissions;
create policy "Anyone can submit guest photographs" on public.submissions for insert with check (true);

drop policy if exists "Service role full access on submissions" on public.submissions;
create policy "Service role full access on submissions" on public.submissions for all using (true) with check (true);

-- Policies for submission_contacts
drop policy if exists "Anyone can insert submission contacts" on public.submission_contacts;
create policy "Anyone can insert submission contacts" on public.submission_contacts for insert with check (true);

drop policy if exists "Anyone can read own submission contact" on public.submission_contacts;
create policy "Anyone can read own submission contact" on public.submission_contacts for select using (true);

drop policy if exists "Service role full access on submission_contacts" on public.submission_contacts;
create policy "Service role full access on submission_contacts" on public.submission_contacts for all using (true) with check (true);

-- 4. INITIAL & MIGRATED DATA (ON CONFLICT DO NOTHING)

-- Events Data
INSERT INTO public.events (id, name, location, scheduled_at, owner_id, status, max_submissions, chosen_layout_id, chosen_layout_ids, final_wall_image_url, created_at, owner_email)
VALUES
  ('e0000000-0000-4000-8000-000000000001', 'Elena & Marcus — Villa Solaria', 'Ravello, Amalfi Coast', '2026-10-17 17:23:33.495+00', 'c56b5e8b-b04f-4c33-b4e3-47caca47334d', 'open', 500, 'scatter-loose', '{}', NULL, '2026-10-17 17:23:33.496243+00', NULL),
  ('2490b50e-da5d-4440-a014-4f832c4ab238', 'Autumn Solstice Gala', 'Hudson Valley', NULL, 'e33e3a59-9415-4827-876f-002967d1199b', 'open', 250, NULL, '{}', NULL, '2026-10-17 20:32:32.558007+00', NULL),
  ('473e2cd1-599a-4d3b-9800-9ca8ac02c1ca', 'Mefil', 'india', '2026-10-22 00:00:00+00', 'd8c70995-e89b-4e14-92ab-08baf213d7e0', 'open', 500, NULL, '{}', NULL, '2026-10-17 21:25:15.433304+00', NULL),
  ('c52ae444-8ce7-4ac9-a0ae-6de4ae2f5a86', 'Mefil', 'MG road', '2026-10-21 00:00:00+00', 'feec33f5-d047-434c-9f6f-e21639965d7c', 'open', 500, 'scatter', '{}', '/uploads/c52ae444-8ce7-4ac9-a0ae-6de4ae2f5a86/1792254052685-master-artwork-c52ae444-8ce7-4ac9-a0ae-6de4ae2f5a86.png', '2026-10-17 21:46:28.048947+00', NULL)
ON CONFLICT (id) DO NOTHING;

-- Submissions Data
INSERT INTO public.submissions (id, event_id, phone_hash, caption, photo_url, polaroid_url, status, reuse_consent, created_at, updated_at)
VALUES
  ('e05be3af-aa25-4aeb-815b-b05ae40cec4c', 'e0000000-0000-4000-8000-000000000001', '5d168de58bf40f28101b320662c17964b56784ded07b5ec3d1e50460bac83ca9', 'under the olive trees with everyone we love', 'https://images.unsplash.com/photo-1519741497674-611481863552?w=800&auto=format&fit=crop&q=80', 'https://images.unsplash.com/photo-1519741497674-611481863552?w=800&auto=format&fit=crop&q=80', 'approved', true, '2026-10-17 17:23:33.497968+00', '2026-10-17 17:23:33.497968+00'),
  ('c8964b2f-c816-4ffe-85b2-256b71ead0d2', 'e0000000-0000-4000-8000-000000000001', 'a6609664c63d22ccbf0eab204d282c6c817ef900fd318f55e17653211734dcba', 'the impromptu toast that made everyone cry', 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=800&auto=format&fit=crop&q=80', 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=800&auto=format&fit=crop&q=80', 'approved', true, '2026-10-17 17:23:33.500807+00', '2026-10-17 17:23:33.500807+00'),
  ('c1aa0bee-dc5e-43c4-a37c-d2ecb21d7792', 'e0000000-0000-4000-8000-000000000001', '2da99d124a268c8b07329fdd9711fbdb0cc0baaf4a8b6860a33747ead08c9109', 'dancing till the candles burned all the way down', 'https://images.unsplash.com/photo-1532712938310-34cb3982ef74?w=800&auto=format&fit=crop&q=80', 'https://images.unsplash.com/photo-1532712938310-34cb3982ef74?w=800&auto=format&fit=crop&q=80', 'approved', true, '2026-10-17 17:23:33.501376+00', '2026-10-17 17:23:33.501376+00'),
  ('1491653c-9e34-4a24-8147-57cef00875be', 'e0000000-0000-4000-8000-000000000001', 'c03f129608b8e1f565f47b56b5030fecaae4c12ca462c65931afae242ae9a4dc', 'found them laughing by the courtyard fountain', 'https://images.unsplash.com/photo-1469371670807-013ccf25f16a?w=800&auto=format&fit=crop&q=80', 'https://images.unsplash.com/photo-1469371670807-013ccf25f16a?w=800&auto=format&fit=crop&q=80', 'approved', true, '2026-10-17 17:23:33.501904+00', '2026-10-17 17:23:33.501904+00'),
  ('289d01fd-5c5b-44ff-a57c-998a925e1a51', 'e0000000-0000-4000-8000-000000000001', '16fb4ace991f8b81ab36e3a3ba024f87a11764bc40c3d183148c6d7b05e23fc0', 'three generations, one quiet smile', 'https://images.unsplash.com/photo-1520854221256-17451cc331bf?w=800&auto=format&fit=crop&q=80', 'https://images.unsplash.com/photo-1520854221256-17451cc331bf?w=800&auto=format&fit=crop&q=80', 'approved', true, '2026-10-17 17:23:33.502411+00', '2026-10-17 17:23:33.502411+00'),
  ('ff128d0c-a16f-45f3-ba88-79f911b0d3cb', 'e0000000-0000-4000-8000-000000000001', '7a6ba9fd550c08833a8baae74f15f2d397e1d0ccc49ea5856c258cce097f3451', 'stole away for five minutes to watch the sunset', 'https://images.unsplash.com/photo-1522673607200-164d1b6ce486?w=800&auto=format&fit=crop&q=80', 'https://images.unsplash.com/photo-1522673607200-164d1b6ce486?w=800&auto=format&fit=crop&q=80', 'pending', true, '2026-10-17 17:23:33.502909+00', '2026-10-17 17:23:33.502909+00'),
  ('efdba246-0c98-4c13-8bad-3e5afd9c9c7b', 'e0000000-0000-4000-8000-000000000001', '68c7b5a4104ea183f3f2e40037028db888dae010c2265dad74e56e0ee9fbf7ae', 'the late night cannoli run', 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800&auto=format&fit=crop&q=80', 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800&auto=format&fit=crop&q=80', 'pending', true, '2026-10-17 17:23:33.503467+00', '2026-10-17 17:23:33.503467+00'),
  ('8acc0305-a65a-415b-a783-ae741d3c6178', 'c52ae444-8ce7-4ac9-a0ae-6de4ae2f5a86', '45f635950807e3b7868e15ef3c87c3cc702ba547b5dbcf346c1ae78f4c8d4a5e', 'the night we finally got everyone together', '/uploads/c52ae444-8ce7-4ac9-a0ae-6de4ae2f5a86/1792255066347-guest.jpg', '/uploads/c52ae444-8ce7-4ac9-a0ae-6de4ae2f5a86/1792255066377-polaroid-1792255066348.jpg', 'rejected', true, '2026-10-17 22:06:06.927703+00', '2026-10-17 22:29:58.054367+00'),
  ('55e2be3b-c306-41a9-9f09-8173f6089fca', 'c52ae444-8ce7-4ac9-a0ae-6de4ae2f5a86', '2d3e9969e2eac6dabf430763b3c434cfd24204aae5a8e74f93f1ae607a0f9fe7', 'asdfghjk', '/uploads/c52ae444-8ce7-4ac9-a0ae-6de4ae2f5a86/1792257045349-8f16c9ae-0d99-4433-9798-20ac877cbe00.png', '/uploads/c52ae444-8ce7-4ac9-a0ae-6de4ae2f5a86/1792257046597-polaroid-1792257045352.jpg', 'pending', true, '2026-10-17 21:47:39.366869+00', '2026-10-17 22:40:46.724413+00')
ON CONFLICT (id) DO NOTHING;
