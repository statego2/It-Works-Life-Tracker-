-- It Works cloud schema foundation (NOT activated in production).
-- Requires a configured Supabase project and integration/security testing.
-- The web preview remains local-only until an authenticated adapter is implemented.

create extension if not exists pgcrypto;

create table if not exists public.areas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  description text,
  sort_order integer not null default 0,
  color text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  unique (id,user_id),
  check (color is null or color ~ '^#[0-9a-fA-F]{6}$')
);

create table if not exists public.metrics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  area_id uuid not null,
  title text not null check (char_length(title) between 1 and 120),
  description text,
  kind text not null check (kind in ('standard','goal')),
  value_type text not null check (value_type in ('number','money','percentage','boolean','frequency')),
  comparator text not null default 'at_least' check (comparator in ('at_least','at_most','exact')),
  unit text not null default '',
  is_gold boolean not null default false,
  sort_order integer not null default 0,
  gold_sort_order integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  unique (id,user_id),
  foreign key (area_id,user_id) references public.areas (id,user_id) on delete cascade
);

create table if not exists public.actual_observations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  metric_id uuid not null,
  value jsonb not null check (jsonb_typeof(value) = 'object'),
  observed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  correction_of uuid,
  superseded_at timestamptz,
  foreign key (metric_id,user_id) references public.metrics (id,user_id) on delete cascade,
  unique (id,user_id),
  foreign key (correction_of,user_id) references public.actual_observations (id,user_id)
);

create table if not exists public.target_revisions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  metric_id uuid not null,
  value jsonb not null check (jsonb_typeof(value) = 'object'),
  effective_from timestamptz not null default now(),
  created_at timestamptz not null default now(),
  foreign key (metric_id,user_id) references public.metrics (id,user_id) on delete cascade
);

create table if not exists public.personal_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default '' check (char_length(title)<=120),
  body text not null default '' check (char_length(body)<=4000),
  pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id,user_id)
);

create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  purpose_text text not null default '' check (char_length(purpose_text)<=1000),
  purpose_visible boolean not null default true,
  vision_visible boolean not null default false,
  vision_mode text not null default 'fixed' check (vision_mode in ('fixed','rotate')),
  rotation_hours integer not null default 3 check (rotation_hours in (1,3,6,12,24)),
  updated_at timestamptz not null default now()
);

-- Image binary content will belong in a private storage bucket, not public
-- database columns. Do not expose storage paths to another account.
create table if not exists public.vision_images (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  storage_path text not null check (char_length(storage_path) between 1 and 512),
  title text not null default '' check (char_length(title)<=120),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (id,user_id)
);

create index if not exists idx_areas_owner_order on public.areas(user_id,sort_order);
create index if not exists idx_metrics_owner_area on public.metrics(user_id,area_id,sort_order);
create index if not exists idx_metrics_owner_gold on public.metrics(user_id,is_gold,gold_sort_order);
create index if not exists idx_actual_owner_time on public.actual_observations(user_id,metric_id,observed_at desc,created_at desc);
create index if not exists idx_targets_owner_time on public.target_revisions(user_id,metric_id,effective_from desc,created_at desc);
create index if not exists idx_notes_owner_updated on public.personal_notes(user_id,updated_at desc);
create index if not exists idx_images_owner_order on public.vision_images(user_id,sort_order);

alter table public.areas enable row level security;
alter table public.metrics enable row level security;
alter table public.actual_observations enable row level security;
alter table public.target_revisions enable row level security;
alter table public.personal_notes enable row level security;
alter table public.user_preferences enable row level security;
alter table public.vision_images enable row level security;

-- Authentication checks must be made against auth.uid(), NEVER a client input.
create policy "Owner access to areas" on public.areas for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "Owner access to metrics" on public.metrics for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "Owner access to observations" on public.actual_observations for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "Owner access to targets" on public.target_revisions for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "Owner access to notes" on public.personal_notes for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "Owner access to preferences" on public.user_preferences for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "Owner access to vision images" on public.vision_images for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

revoke all on public.areas,public.metrics,public.actual_observations,public.target_revisions,public.personal_notes,public.user_preferences,public.vision_images from anon;
grant select,insert,update,delete on public.areas,public.metrics,public.actual_observations,public.target_revisions,public.personal_notes,public.user_preferences,public.vision_images to authenticated;
