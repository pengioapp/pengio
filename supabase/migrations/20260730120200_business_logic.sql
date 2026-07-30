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
