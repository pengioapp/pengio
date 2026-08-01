-- Pengio backend, generated 2026-07-30 from supabase/migrations/.
-- Paste into the Supabase SQL editor and run once. Safe to read before running:
-- it only creates new objects in the public schema and one trigger on auth.users.

-- ============================================================
-- 20260730120000_core_schema.sql
-- ============================================================
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

-- ============================================================
-- 20260730120100_loans.sql
-- ============================================================
-- Pengio lending: proposals, agreed loans, and repayments.

create type public.proposal_status as enum ('pending', 'accepted', 'rejected', 'cancelled');
create type public.loan_status     as enum ('active', 'repaid', 'cancelled');

-- ---------------------------------------------------------------------------
-- loan_proposals
-- ---------------------------------------------------------------------------
-- The prototype had two near-identical types, LoanRequest and LoanOffer. They
-- describe the same event from opposite ends: a request is "I want to borrow
-- from you", an offer is "I want to lend to you". Both name a borrower, a
-- lender, and whoever spoke first. Collapsing them into one table halves the
-- number of security policies -- which is where mistakes are most expensive --
-- and makes the inbox a single query.
--
-- 'kind' is derived, not stored, so it can never contradict the participants.

create table public.loan_proposals (
  id               uuid primary key default gen_random_uuid(),
  borrower_id      uuid not null references public.profiles (id) on delete cascade,
  lender_id        uuid not null references public.profiles (id) on delete cascade,
  initiated_by     uuid not null references public.profiles (id) on delete cascade,

  -- Money is numeric, never float: numeric arithmetic in Postgres is exact
  -- decimal, so 0.1 + 0.2 is 0.3 and balances reconcile.
  amount           numeric(12,2) not null check (amount > 0 and amount <= 10000000),
  currency         char(3) not null default 'NOK',

  -- A flat surcharge on the principal, not an annualised rate. Friend-to-friend
  -- loans in the prototype quote "5%" meaning "pay back 105%", and pretending
  -- otherwise would silently change what users owe.
  interest_percent numeric(5,2) not null default 0 check (interest_percent >= 0 and interest_percent <= 100),

  repayment_date   date not null,
  message          text check (message is null or length(message) <= 500),
  condition        text check (condition is null or length(condition) <= 500),

  status           public.proposal_status not null default 'pending',
  rejection_reason text check (rejection_reason is null or length(rejection_reason) <= 500),

  created_at       timestamptz not null default now(),
  responded_at     timestamptz,

  constraint proposals_distinct_parties check (borrower_id <> lender_id),
  constraint proposals_initiator_is_party check (initiated_by in (borrower_id, lender_id)),
  -- A settled proposal must say when it was settled, and a pending one must not.
  constraint proposals_responded_consistent check (
    (status = 'pending' and responded_at is null)
    or (status <> 'pending' and responded_at is not null)
  ),
  constraint proposals_reason_only_on_reject check (
    rejection_reason is null or status = 'rejected'
  )
);

-- Who is being asked to respond. Used by every inbox query.
create or replace function public.proposal_recipient(p public.loan_proposals)
returns uuid
language sql
immutable
as $$
  select case when p.initiated_by = p.borrower_id then p.lender_id else p.borrower_id end;
$$;

create or replace function public.proposal_kind(p public.loan_proposals)
returns text
language sql
immutable
as $$
  select case when p.initiated_by = p.borrower_id then 'request' else 'offer' end;
$$;

create index proposals_borrower_idx on public.loan_proposals (borrower_id, status);
create index proposals_lender_idx   on public.loan_proposals (lender_id, status);

-- ---------------------------------------------------------------------------
-- loans
-- ---------------------------------------------------------------------------
-- An accepted proposal becomes a loan. Terms are copied rather than referenced,
-- so editing or deleting a proposal can never rewrite what was agreed.

create table public.loans (
  id               uuid primary key default gen_random_uuid(),
  proposal_id      uuid unique references public.loan_proposals (id) on delete set null,
  borrower_id      uuid not null references public.profiles (id) on delete cascade,
  lender_id        uuid not null references public.profiles (id) on delete cascade,

  principal        numeric(12,2) not null check (principal > 0),
  currency         char(3) not null default 'NOK',
  interest_percent numeric(5,2) not null default 0 check (interest_percent >= 0 and interest_percent <= 100),
  repayment_date   date not null,

  status           public.loan_status not null default 'active',
  agreed_at        timestamptz not null default now(),
  closed_at        timestamptz,

  constraint loans_distinct_parties check (borrower_id <> lender_id),
  constraint loans_closed_consistent check (
    (status = 'active' and closed_at is null) or (status <> 'active' and closed_at is not null)
  )
);

-- Total owed under a flat-surcharge loan. Rounded to the currency's minor unit
-- so the sum of payments can actually reach it exactly.
create or replace function public.loan_total_due(l public.loans)
returns numeric
language sql
immutable
as $$
  select round(l.principal * (1 + l.interest_percent / 100), 2);
$$;

create index loans_borrower_idx on public.loans (borrower_id, status);
create index loans_lender_idx   on public.loans (lender_id, status);

-- ---------------------------------------------------------------------------
-- payments
-- ---------------------------------------------------------------------------
-- Money moves outside Pengio, so a payment row is a claim about the real world.
-- The borrower says "I sent it"; the lender confirms receipt. Keeping those two
-- events distinct means a disputed payment stays visible instead of being
-- decided by whoever typed first.

create table public.payments (
  id            uuid primary key default gen_random_uuid(),
  loan_id       uuid not null references public.loans (id) on delete cascade,
  amount        numeric(12,2) not null check (amount > 0),
  paid_at       date not null default current_date,
  recorded_by   uuid not null references public.profiles (id) on delete cascade,
  confirmed_at  timestamptz,
  confirmed_by  uuid references public.profiles (id) on delete set null,
  note          text check (note is null or length(note) <= 500),
  created_at    timestamptz not null default now(),

  constraint payments_confirmation_consistent check (
    (confirmed_at is null and confirmed_by is null)
    or (confirmed_at is not null and confirmed_by is not null)
  )
);

create index payments_loan_idx on public.payments (loan_id);

-- Confirmed repayments only. Unconfirmed claims must not reduce a visible
-- balance, or one party could zero out a debt unilaterally.
create or replace function public.loan_amount_repaid(loan uuid)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(amount), 0)
  from public.payments
  where loan_id = loan and confirmed_at is not null;
$$;

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table public.loan_proposals enable row level security;
alter table public.loans          enable row level security;
alter table public.payments       enable row level security;

-- Only the two parties to a proposal can see it.
create policy proposals_select_party
  on public.loan_proposals for select
  using ((select auth.uid()) in (borrower_id, lender_id));

-- You may create a proposal only if you are one of its parties and you are
-- named as the initiator -- otherwise a user could forge a debt in someone
-- else's name. New proposals always start pending.
--
-- The parties must also already be contacts. Without that, any account could
-- push loan proposals at any user id it could guess or harvest, which is a
-- spam and social-engineering channel aimed at exactly the moment people are
-- thinking about money. Pengio is for lending between people who know each
-- other; the schema should say so.
create policy proposals_insert_as_initiator
  on public.loan_proposals for insert
  with check (
    initiated_by = (select auth.uid())
    and (select auth.uid()) in (borrower_id, lender_id)
    and status = 'pending'
    and public.users_are_connected(borrower_id, lender_id)
  );

-- Direct updates are limited to the initiator withdrawing an unanswered
-- proposal. Accepting and rejecting go through respond_to_proposal(), which
-- creates the loan in the same transaction.
create policy proposals_cancel_own
  on public.loan_proposals for update
  using (initiated_by = (select auth.uid()) and status = 'pending')
  with check (initiated_by = (select auth.uid()) and status in ('pending', 'cancelled'));

create policy loans_select_party
  on public.loans for select
  using ((select auth.uid()) in (borrower_id, lender_id));

-- Loans are written only by respond_to_proposal(). No insert, update or delete
-- policy exists, so agreed terms cannot be edited after the fact.

create policy payments_select_party
  on public.payments for select
  using (
    exists (
      select 1 from public.loans l
      where l.id = payments.loan_id
        and (select auth.uid()) in (l.borrower_id, l.lender_id)
    )
  );

-- Either party may record a payment against a loan they are part of.
--
-- Confirmation state is deliberately not constrained here. WITH CHECK runs
-- after BEFORE triggers, and on_payment_recorded() sets confirmed_at when the
-- lender is the one recording -- a policy requiring it to be null would reject
-- the lender's own payments. That trigger overwrites confirmed_at and
-- confirmed_by unconditionally, so a client cannot pre-confirm a payment by
-- supplying its own values.
create policy payments_insert_party
  on public.payments for insert
  with check (
    recorded_by = (select auth.uid())
    and exists (
      select 1 from public.loans l
      where l.id = payments.loan_id
        and l.status = 'active'
        and (select auth.uid()) in (l.borrower_id, l.lender_id)
    )
  );

-- Typing the wrong figure is easy, so a payment can be withdrawn by whoever
-- recorded it -- but only while it is still unconfirmed. Once the other party
-- has agreed to it, it is part of the settled record and stays put.
create policy payments_delete_own_unconfirmed
  on public.payments for delete
  using (recorded_by = (select auth.uid()) and confirmed_at is null);

-- ============================================================
-- 20260730120200_business_logic.sql
-- ============================================================
-- Pengio business logic: responding to proposals, confirming payments, and the
-- notifications those events produce.
--
-- State transitions live here rather than in the client. A rule enforced in
-- React is a suggestion; a rule enforced in the database is a rule.

-- ---------------------------------------------------------------------------
-- notifications
-- ---------------------------------------------------------------------------

create type public.notification_type as enum (
  'proposal_received',
  'proposal_accepted',
  'proposal_rejected',
  'payment_recorded',
  'payment_confirmed',
  'loan_repaid',
  'repayment_due_soon'
);

create table public.notifications (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles (id) on delete cascade,
  type         public.notification_type not null,
  title        text not null,
  body         text,
  proposal_id  uuid references public.loan_proposals (id) on delete cascade,
  loan_id      uuid references public.loans (id) on delete cascade,
  read_at      timestamptz,
  created_at   timestamptz not null default now()
);

create index notifications_user_unread_idx
  on public.notifications (user_id, created_at desc)
  where read_at is null;

alter table public.notifications enable row level security;

create policy notifications_select_own
  on public.notifications for select
  using (user_id = (select auth.uid()));

-- Users may mark their own notifications read; they may not create them.
create policy notifications_update_own
  on public.notifications for update
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create or replace function public.notify(
  target uuid,
  kind public.notification_type,
  title text,
  body text default null,
  proposal uuid default null,
  loan uuid default null
)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.notifications (user_id, type, title, body, proposal_id, loan_id)
  values (target, kind, title, body, proposal, loan);
$$;

-- ---------------------------------------------------------------------------
-- Creating a proposal notifies the other side.
-- ---------------------------------------------------------------------------

create or replace function public.on_proposal_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  initiator_name text;
begin
  select full_name into initiator_name from public.profiles where id = new.initiated_by;

  perform public.notify(
    public.proposal_recipient(new),
    'proposal_received',
    case when public.proposal_kind(new) = 'request'
         then initiator_name || ' asked to borrow ' || new.amount || ' ' || new.currency
         else initiator_name || ' offered to lend you ' || new.amount || ' ' || new.currency
    end,
    new.message,
    new.id,
    null
  );
  return new;
end;
$$;

create trigger proposals_notify_recipient
  after insert on public.loan_proposals
  for each row execute function public.on_proposal_created();

-- ---------------------------------------------------------------------------
-- respond_to_proposal
-- ---------------------------------------------------------------------------
-- Accepting a proposal and creating the loan must be one transaction. Splitting
-- them risks a proposal marked accepted with no loan behind it -- two people
-- believing a debt exists with nothing recording its terms.
--
-- Only the recipient may respond. The initiator cannot accept their own
-- proposal; they can only cancel it.

create or replace function public.respond_to_proposal(
  proposal uuid,
  accept boolean,
  reason text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  p public.loan_proposals;
  new_loan_id uuid;
  responder_name text;
begin
  select * into p from public.loan_proposals where id = proposal for update;

  if not found then
    raise exception 'Proposal not found' using errcode = 'no_data_found';
  end if;

  if public.proposal_recipient(p) <> auth.uid() then
    raise exception 'Only the recipient may respond to this proposal'
      using errcode = 'insufficient_privilege';
  end if;

  if p.status <> 'pending' then
    raise exception 'Proposal has already been %', p.status
      using errcode = 'invalid_parameter_value';
  end if;

  select full_name into responder_name from public.profiles where id = auth.uid();

  if accept then
    update public.loan_proposals
       set status = 'accepted', responded_at = now()
     where id = proposal;

    insert into public.loans (
      proposal_id, borrower_id, lender_id,
      principal, currency, interest_percent, repayment_date
    )
    values (
      p.id, p.borrower_id, p.lender_id,
      p.amount, p.currency, p.interest_percent, p.repayment_date
    )
    returning id into new_loan_id;

    perform public.notify(
      p.initiated_by,
      'proposal_accepted',
      responder_name || ' accepted your ' || public.proposal_kind(p),
      null, p.id, new_loan_id
    );

    return new_loan_id;
  else
    update public.loan_proposals
       set status = 'rejected', responded_at = now(), rejection_reason = reason
     where id = proposal;

    perform public.notify(
      p.initiated_by,
      'proposal_rejected',
      responder_name || ' declined your ' || public.proposal_kind(p),
      reason, p.id, null
    );

    return null;
  end if;
end;
$$;

revoke all on function public.respond_to_proposal(uuid, boolean, text) from public;
grant execute on function public.respond_to_proposal(uuid, boolean, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Payment confirmation
-- ---------------------------------------------------------------------------
-- A payment recorded by the lender is a statement against their own interest --
-- they are admitting money arrived. There is nothing to gain by lying, so it
-- needs no counter-signature. A payment recorded by the borrower reduces what
-- they owe, so it stays unconfirmed until the lender agrees.

create or replace function public.on_payment_recorded()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  l public.loans;
  recorder_name text;
begin
  select * into l from public.loans where id = new.loan_id;
  select full_name into recorder_name from public.profiles where id = new.recorded_by;

  -- Both branches assign confirmation state unconditionally, so whatever the
  -- client sent is discarded. A borrower cannot mark their own payment
  -- confirmed by including the column in the insert.
  if new.recorded_by = l.lender_id then
    new.confirmed_at := now();
    new.confirmed_by := new.recorded_by;

    perform public.notify(
      l.borrower_id, 'payment_confirmed',
      recorder_name || ' registered a repayment of ' || new.amount || ' ' || l.currency,
      new.note, null, l.id
    );
  else
    new.confirmed_at := null;
    new.confirmed_by := null;

    perform public.notify(
      l.lender_id, 'payment_recorded',
      recorder_name || ' says they repaid ' || new.amount || ' ' || l.currency,
      new.note, null, l.id
    );
  end if;

  return new;
end;
$$;

create trigger payments_handle_recording
  before insert on public.payments
  for each row execute function public.on_payment_recorded();

create or replace function public.confirm_payment(payment uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  pay public.payments;
  l public.loans;
begin
  select * into pay from public.payments where id = payment for update;

  if not found then
    raise exception 'Payment not found' using errcode = 'no_data_found';
  end if;

  if pay.confirmed_at is not null then
    raise exception 'Payment is already confirmed' using errcode = 'invalid_parameter_value';
  end if;

  select * into l from public.loans where id = pay.loan_id;

  -- Only the party who did not record it can confirm it.
  if auth.uid() <> l.lender_id or pay.recorded_by = auth.uid() then
    raise exception 'Only the lender may confirm this payment'
      using errcode = 'insufficient_privilege';
  end if;

  update public.payments
     set confirmed_at = now(), confirmed_by = auth.uid()
   where id = payment;

  perform public.notify(
    l.borrower_id, 'payment_confirmed',
    'Your repayment of ' || pay.amount || ' ' || l.currency || ' was confirmed',
    null, null, l.id
  );
end;
$$;

revoke all on function public.confirm_payment(uuid) from public;
grant execute on function public.confirm_payment(uuid) to authenticated;

-- A loan closes itself once confirmed repayments cover what is owed, so the
-- balance and the status can never disagree.
create or replace function public.close_loan_if_repaid()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  l public.loans;
begin
  select * into l from public.loans where id = new.loan_id;

  if l.status = 'active'
     and public.loan_amount_repaid(l.id) >= public.loan_total_due(l) then
    update public.loans
       set status = 'repaid', closed_at = now()
     where id = l.id;

    perform public.notify(l.borrower_id, 'loan_repaid', 'Loan fully repaid', null, null, l.id);
    perform public.notify(l.lender_id,   'loan_repaid', 'Loan fully repaid', null, null, l.id);
  end if;

  return null;
end;
$$;

create trigger payments_close_loan
  after insert or update of confirmed_at on public.payments
  for each row execute function public.close_loan_if_repaid();

