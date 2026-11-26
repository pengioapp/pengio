-- Pengio: find people by phone number.
--
-- Paste this whole file into the Supabase SQL editor and press Run. Safe to
-- run twice -- everything is create-or-replace or guarded by "if not exists".
--
-- One thing can make it fail, and it needs a human: the unique index. If two
-- accounts have already saved the same number, Postgres refuses to create it
-- and says so. That is the right outcome -- someone has to decide which
-- account is real -- so send me the error rather than forcing it through.

-- Finding people by phone number, the way Vipps does.
--
-- Testers found it cumbersome to add someone by email, and they are right:
-- nobody knows a friend's email off the top of their head, but everyone knows
-- their number. This makes the number the way people find each other.
--
-- The important caveat, written here because it governs every design choice
-- below: these numbers are NOT verified. Without an SMS provider there is no
-- way to prove someone controls the number they typed. So this is built to
-- limit the damage that fact can do, not to pretend otherwise.

-- ---------------------------------------------------------------------------
-- normalise_phone
-- ---------------------------------------------------------------------------
-- "+47 912 34 567", "91234567" and "004791234567" are one number typed three
-- ways. Matching has to happen on a single canonical form or a lookup fails
-- for reasons the user cannot see.

create or replace function public.normalise_phone(raw text)
returns text
language plpgsql
immutable
as $norm$
declare
  digits text;
begin
  if raw is null or trim(raw) = '' then
    return null;
  end if;

  -- Keep digits only; the leading + is re-added from the shape of what remains.
  digits := regexp_replace(raw, '[^0-9]', '', 'g');

  if digits = '' then
    return null;
  end if;

  -- 00 is the old international prefix, equivalent to +.
  if left(digits, 2) = '00' then
    digits := substr(digits, 3);
  end if;

  -- A bare Norwegian mobile or landline is eight digits with no country code.
  -- Pengio is a Norwegian app, so that is the sensible assumption; anything
  -- else must be typed with its country code.
  if length(digits) = 8 then
    digits := '47' || digits;
  end if;

  -- E.164 allows 8 to 15 digits including the country code. Outside that it is
  -- a typo, and storing it would only create a contact nobody can match.
  if length(digits) < 8 or length(digits) > 15 then
    return null;
  end if;

  return '+' || digits;
end;
$norm$;

comment on function public.normalise_phone is
  'Canonical E.164 form, assuming +47 for bare eight-digit numbers. Returns null for anything implausible.';

-- ---------------------------------------------------------------------------
-- Normalised, unique phone numbers on profiles
-- ---------------------------------------------------------------------------
-- Stored normalised rather than normalised on read, so the uniqueness
-- constraint actually means something.

create or replace function public.normalise_profile_phone()
returns trigger
language plpgsql
as $tidy$
begin
  new.phone := public.normalise_phone(new.phone);
  return new;
end;
$tidy$;

drop trigger if exists profiles_normalise_phone on public.profiles;
create trigger profiles_normalise_phone
  before insert or update of phone on public.profiles
  for each row execute function public.normalise_profile_phone();

-- Existing rows were entered before any of this, in whatever shape the user
-- typed. Bring them to the canonical form before the index goes on.
update public.profiles
   set phone = public.normalise_phone(phone)
 where phone is not null
   and phone is distinct from public.normalise_phone(phone);

-- One number, one account. This is the whole of the impersonation defence
-- while numbers are unverified: whoever claims a number holds it, and nobody
-- else can claim the same one and sit alongside them in search results.
--
-- If this fails, two accounts already share a number and a human has to decide
-- which is real -- it should not be resolved silently.
create unique index if not exists profiles_phone_unique
  on public.profiles (phone)
  where phone is not null;

-- ---------------------------------------------------------------------------
-- Phone at signup
-- ---------------------------------------------------------------------------
-- Replaces the version that only read full_name. A profile with no number
-- cannot be found by anyone, which is the state every existing account is in.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $newuser$
begin
  insert into public.profiles (id, full_name, email, phone)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(new.email, '@', 1)),
    new.email,
    public.normalise_phone(new.raw_user_meta_data ->> 'phone')
  );
  return new;
end;
$newuser$;

-- ---------------------------------------------------------------------------
-- Rate limiting
-- ---------------------------------------------------------------------------
-- An exact-match lookup that returns a name is a directory. Given a list of
-- numbers, someone could walk it and harvest who is registered. Verification
-- would not fix that either -- the fix is to make walking it slow.

create table if not exists public.phone_lookups (
  id            bigserial primary key,
  user_id       uuid not null references public.profiles (id) on delete cascade,
  looked_up_at  timestamptz not null default now()
);

create index if not exists phone_lookups_user_time_idx
  on public.phone_lookups (user_id, looked_up_at desc);

alter table public.phone_lookups enable row level security;
-- No policies: the table is written and read only by the security definer
-- function below. Nobody reads their own audit trail, and nobody else's.

-- ---------------------------------------------------------------------------
-- find_user_by_phone
-- ---------------------------------------------------------------------------
-- Exact match only, one number at a time, never a prefix or partial search.
-- A partial search over a table of people who borrow money is an enumeration
-- tool, and no amount of rate limiting makes it a reasonable thing to offer.
--
-- Returns the name and nothing else. Not the email, not the number back, not
-- the id of anything they are party to.

create or replace function public.find_user_by_phone(phone text)
returns table (id uuid, full_name text)
language plpgsql
security definer
set search_path = public
as $find$
declare
  target text;
  recent int;
begin
  if auth.uid() is null then
    raise exception 'contacts.notSignedIn' using errcode = 'insufficient_privilege';
  end if;

  target := public.normalise_phone(phone);
  if target is null then
    raise exception 'phone.invalid' using errcode = 'invalid_parameter_value';
  end if;

  select count(*) into recent
    from public.phone_lookups
   where user_id = auth.uid()
     and looked_up_at > now() - interval '1 hour';

  -- Generous for a person adding contacts, useless for walking a number range.
  if recent >= 40 then
    raise exception 'phone.rateLimited' using errcode = 'invalid_parameter_value';
  end if;

  insert into public.phone_lookups (user_id) values (auth.uid());

  return query
    select p.id, p.full_name
      from public.profiles p
     where p.phone = target
       and p.id <> auth.uid();
end;
$find$;

revoke all on function public.find_user_by_phone(text) from public;
grant execute on function public.find_user_by_phone(text) to authenticated;

-- ---------------------------------------------------------------------------
-- Linking a contact by phone as well as email
-- ---------------------------------------------------------------------------
-- Adding someone by number should connect the two accounts the same way adding
-- them by address does, otherwise a phone-only contact can never be lent to.

create or replace function public.link_contact_to_account()
returns trigger
language plpgsql
security definer
set search_path = public
as $link$
declare
  own_email text;
  own_phone text;
begin
  select email, phone into own_email, own_phone
    from public.profiles where id = new.owner_id;

  new.phone := public.normalise_phone(new.phone);

  if new.email is not null and lower(trim(new.email)) = lower(own_email) then
    raise exception 'contacts.cannotAddSelf' using errcode = 'invalid_parameter_value';
  end if;

  if new.phone is not null and own_phone is not null and new.phone = own_phone then
    raise exception 'contacts.cannotAddSelf' using errcode = 'invalid_parameter_value';
  end if;

  -- Email first: it was the only link for every contact added before now, so
  -- preferring it keeps existing rows resolving exactly as they did.
  if new.contact_user_id is null and new.email is not null then
    select p.id into new.contact_user_id from public.profiles p
     where lower(p.email) = lower(trim(new.email)) and p.id <> new.owner_id;
  end if;

  if new.contact_user_id is null and new.phone is not null then
    select p.id into new.contact_user_id from public.profiles p
     where p.phone = new.phone and p.id <> new.owner_id;
  end if;

  return new;
end;
$link$;

-- ---------------------------------------------------------------------------
-- Late joiners, by phone too
-- ---------------------------------------------------------------------------

create or replace function public.link_pending_contacts()
returns trigger
language plpgsql
security definer
set search_path = public
as $pending$
begin
  update public.contacts c
     set contact_user_id = new.id
   where c.contact_user_id is null
     and c.owner_id <> new.id
     and (
       lower(trim(c.email)) = lower(new.email)
       or (new.phone is not null and c.phone = new.phone)
     );
  return new;
end;
$pending$;
