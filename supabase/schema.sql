create extension if not exists "uuid-ossp";

create table events (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  owner_id uuid not null,
  status text not null default 'open',
  alter table events add column if not exists max_submissions integer not null default 500;
  chosen_layout_id text,
  alter table events add column if not exists chosen_layout_ids text[] not null default '{}';
  final_wall_image_url text,
  created_at timestamptz not null default now()
);

create table event_collaborators (
  event_id uuid not null references events(id) on delete cascade,
  user_id uuid not null,
  added_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

create table submissions (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid not null references events(id) on delete cascade,
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

create unique index submissions_event_phone_unique
  on submissions (event_id, phone_hash);

create index submissions_event_status_idx
  on submissions (event_id, status);

alter table events enable row level security;
alter table event_collaborators enable row level security;
alter table submissions enable row level security;

create policy "Anyone can read events" on events
  for select using (true);

create policy "Anyone can read approved submissions" on submissions
  for select using (status = 'approved');