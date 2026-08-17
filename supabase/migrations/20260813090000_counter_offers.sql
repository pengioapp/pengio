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
