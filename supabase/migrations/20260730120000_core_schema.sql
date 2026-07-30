-- Pengio core schema: identity and the social graph.
--
-- Scope note: Pengio records agreements between people. It never holds or moves
-- money -- settlement happens outside the app (Vipps, bank transfer) and users
-- record it here. Nothing in this schema should assume custody of funds.

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
-- One row per authenticated user. auth.users holds credentials; everything the
-- app renders lives here.

create table public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  full_name     text not null check (length(trim(full_name)) between 1 and 120),
  email         text not null,
  phone         text,
  residence     text,
  birth_date    date,
  profession    text,
  about_me      text check (about_me is null or length(about_me) <= 1000),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table public.profiles is
  'Public-facing user data. Credentials stay in auth.users.';

-- The prototype stored a two-letter avatar string per user. Deriving it removes
-- a field that could drift out of sync with the name.
create or replace function public.avatar_initials(full_name text)
returns text
language sql
immutable
as $$
  select upper(
    coalesce(
      substring(split_part(trim(full_name), ' ', 1) from 1 for 1), ''
    ) ||
    coalesce(
      nullif(substring(split_part(trim(full_name), ' ', 2) from 1 for 1), ''), ''
    )
  );
$$;

-- Signing up must always produce a profile, so this is a trigger rather than an
-- application-side insert that could be skipped or fail independently.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(new.email, '@', 1)),
    new.email
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- contacts
-- ---------------------------------------------------------------------------
-- The prototype used one global contact list shared by everyone. Real contacts
-- are per-user, and a contact may not have a Pengio account yet -- hence the
-- nullable contact_user_id alongside the free-text fields.

create table public.contacts (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid not null references public.profiles (id) on delete cascade,
  contact_user_id uuid references public.profiles (id) on delete set null,
  display_name    text not null check (length(trim(display_name)) between 1 and 120),
  phone           text,
  email           text,
  created_at      timestamptz not null default now(),

  constraint contacts_no_self check (contact_user_id is null or contact_user_id <> owner_id),
  constraint contacts_reachable check (phone is not null or email is not null or contact_user_id is not null)
);

-- Adding the same person twice is a data-entry mistake, not a use case.
create unique index contacts_owner_user_unique
  on public.contacts (owner_id, contact_user_id)
  where contact_user_id is not null;

create index contacts_owner_idx on public.contacts (owner_id);

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------
-- Every table is deny-by-default. These policies are the only thing standing
-- between one user's debts and another user's eyes, so they are written
-- narrowly and revisited whenever a table gains a new access path.

alter table public.profiles enable row level security;
alter table public.contacts enable row level security;

-- Whether two users have a contact relationship in either direction.
--
-- This is security definer for a reason. Called from an RLS policy as a plain
-- subquery, the read of public.contacts would itself be filtered by
-- contacts_select_own -- so a user could only ever observe relationships they
-- had recorded, making visibility one-directional: if Anna adds Erik, Anna sees
-- Erik but Erik cannot see Anna. Bypassing RLS for this narrow boolean makes
-- the relationship symmetric. It leaks nothing: the answer is derivable from
-- rows the caller is party to, and the function returns only true or false.
create or replace function public.users_are_connected(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.contacts c
    where (c.owner_id = a and c.contact_user_id = b)
       or (c.owner_id = b and c.contact_user_id = a)
  );
$$;

-- A user always sees their own profile in full.
create policy profiles_select_own
  on public.profiles for select
  using (id = (select auth.uid()));

-- Counterparties need to see each other's names. Visibility is earned by an
-- existing relationship -- either side having added the other as a contact --
-- rather than being open to every authenticated user.
create policy profiles_select_related
  on public.profiles for select
  using (public.users_are_connected((select auth.uid()), profiles.id));

create policy profiles_update_own
  on public.profiles for update
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- No insert policy: profiles are created only by the signup trigger.
-- No delete policy: removing a profile happens via auth.users cascade.

create policy contacts_select_own
  on public.contacts for select
  using (owner_id = (select auth.uid()));

create policy contacts_insert_own
  on public.contacts for insert
  with check (owner_id = (select auth.uid()));

create policy contacts_update_own
  on public.contacts for update
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy contacts_delete_own
  on public.contacts for delete
  using (owner_id = (select auth.uid()));
