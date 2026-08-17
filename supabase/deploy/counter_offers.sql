-- Pengio counter-offers. Generated 2026-08-17.
--
-- IMPORTANT: run these as TWO separate queries, in order. Postgres refuses
-- to use a new enum value in the same transaction that added it, so pasting
-- both at once will fail on the second half.

-- ============ STEP 1: run this alone, then clear the editor ============
-- Counter-offers.
--
-- Terms cannot be edited at approval: changing them and calling the result
-- agreement binds the other party to something they never proposed. But
-- "accept or decline" is too blunt for people negotiating a loan between
-- friends. A counter is the missing third answer.
--
-- A counter keeps the same borrower and lender and flips who initiated it, so
-- countering a request naturally becomes an offer and vice versa. The original
-- is marked countered and points to its replacement, leaving the negotiation
-- readable end to end.

alter type public.proposal_status add value if not exists 'countered';

alter type public.notification_type add value if not exists 'proposal_countered';

alter table public.loan_proposals
  add column counter_to uuid references public.loan_proposals (id) on delete set null;

-- A proposal replaces at most one other.
create unique index proposals_counter_to_unique
  on public.loan_proposals (counter_to)
  where counter_to is not null;

comment on column public.loan_proposals.counter_to is
  'The proposal this one was raised in response to, if any.';

-- ============ STEP 2: run this after step 1 succeeds ============
-- Separate from the migration that adds 'countered' to the enum: Postgres
-- refuses to use a new enum value in the same transaction that introduced it.
-- These two files must be applied as separate statements.

-- A countered proposal is a reply, not a fresh approach, so it should read as
-- one. Recipients of a first-time proposal see who is asking; recipients of a
-- counter need to know their own terms were not accepted as-is.
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

  if new.counter_to is not null then
    perform public.notify(
      public.proposal_recipient(new),
      'proposal_countered',
      initiator_name || ' countered with ' || new.amount || ' ' || new.currency
        || ' at ' || new.interest_percent || '%',
      new.message,
      new.id,
      null
    );
  else
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
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- counter_proposal
-- ---------------------------------------------------------------------------
-- Only the side being asked may counter, and only while the proposal is still
-- open. The parties are copied from the original rather than supplied, so a
-- counter cannot quietly redirect the loan to someone else. Marking the
-- original and creating its replacement happen together, so a proposal can
-- never be left countered with nothing to point at.

create or replace function public.counter_proposal(
  proposal uuid,
  new_amount numeric,
  new_interest_percent numeric,
  new_repayment_date date,
  new_message text default null,
  new_condition text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  p public.loan_proposals;
  new_id uuid;
begin
  select * into p from public.loan_proposals where id = proposal for update;

  if not found then
    raise exception 'Proposal not found' using errcode = 'no_data_found';
  end if;

  if public.proposal_recipient(p) <> auth.uid() then
    raise exception 'Only the recipient may counter this proposal'
      using errcode = 'insufficient_privilege';
  end if;

  if p.status <> 'pending' then
    raise exception 'Proposal has already been %', p.status
      using errcode = 'invalid_parameter_value';
  end if;

  -- The same checks the table would apply to a direct insert. This function is
  -- security definer, so row level security does not run for the insert below
  -- and these have to be made explicitly.
  if new_amount is null or new_amount <= 0 then
    raise exception 'Amount must be greater than zero'
      using errcode = 'invalid_parameter_value';
  end if;

  if new_interest_percent is null or new_interest_percent < 0 or new_interest_percent > 100 then
    raise exception 'Interest must be between 0 and 100'
      using errcode = 'invalid_parameter_value';
  end if;

  update public.loan_proposals
     set status = 'countered', responded_at = now()
   where id = proposal;

  -- Borrower and lender carry over; only the initiator changes, which is what
  -- turns a request into an offer and back again.
  insert into public.loan_proposals (
    borrower_id, lender_id, initiated_by,
    amount, currency, interest_percent, repayment_date,
    message, condition, counter_to
  )
  values (
    p.borrower_id, p.lender_id, auth.uid(),
    new_amount, p.currency, new_interest_percent, new_repayment_date,
    new_message, new_condition, p.id
  )
  returning id into new_id;

  return new_id;
end;
$$;

revoke all on function public.counter_proposal(uuid, numeric, numeric, date, text, text) from public;
grant execute on function public.counter_proposal(uuid, numeric, numeric, date, text, text) to authenticated;
