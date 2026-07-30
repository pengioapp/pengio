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
