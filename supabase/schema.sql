-- Run this in the Supabase SQL editor once, to set up the database.

create extension if not exists "uuid-ossp";

-- One row per event. A fresh row + fresh id = a fresh QR every time.
create table events (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  status text not null default 'open',        -- 'open' | 'closed' | 'finalized'
  chosen_layout_id text,                       -- set once she picks her favorite style
  final_wall_image_url text,                   -- set after the final wall is exported
  created_at timestamptz not null default now()
);

-- One row per guest submission.
create table submissions (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid not null references events(id) on delete cascade,
  phone_hash text not null,                    -- HMAC of the phone number, never the raw number
  caption text not null check (char_length(caption) <= 120),
  photo_url text not null,                     -- original upload, in Supabase Storage
  polaroid_url text not null,                  -- rendered polaroid (photo + caption composited)
  status text not null default 'pending',      -- 'pending' | 'approved' | 'rejected'
  position_seed int,                           -- used by the layout algorithm to place it on the wall
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One phone number maps to one submission per event, so re-entering the
-- same number always finds (and can replace) the existing one.
create unique index submissions_event_phone_unique
  on submissions (event_id, phone_hash);

create index submissions_event_status_idx
  on submissions (event_id, status);

-- Row Level Security: writes go through server-side API routes using the
-- service role key (bypasses RLS). Public reads are limited to events and
-- approved submissions only.
alter table events enable row level security;
alter table submissions enable row level security;

create policy "Anyone can read events" on events
  for select using (true);

create policy "Anyone can read approved submissions" on submissions
  for select using (status = 'approved');