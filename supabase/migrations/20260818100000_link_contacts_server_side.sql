-- Fixes a circular dependency that made contact linking impossible.
--
-- The client used to look up a profile by email to find the account to link a
-- contact to. But profiles_select_related only exposes a profile to someone
-- already connected to it, and being connected is what the lookup was trying
-- to establish. The query therefore returned nothing for every genuine case,
-- and every real user was reported as "not on Pengio yet" -- which meant no
-- two people could ever agree a loan.
--
-- Resolution moves into the database, where it can read profiles without being
-- filtered by the caller's policies. The client now inserts only a name and an
-- email and never queries profiles at all.
--
-- Trade-off worth stating: a user can still infer whether an address has a
-- Pengio account by adding it as a contact and seeing whether it links. That
-- is inherent to "add someone by email and find out if you can lend to them".
-- The alternative -- contact requests the other person must accept -- removes
-- the inference but is a larger change; this keeps the disclosure to a single
-- bit about an address the user already knows.

create or replace function public.link_contact_to_account()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  own_email text;
begin
  -- Adding your own address would otherwise create a contact that can never
  -- link, since contacts_no_self forbids pointing at yourself. Saying so beats
  -- silently storing a row that does nothing.
  select email into own_email from public.profiles where id = new.owner_id;
  if new.email is not null and lower(trim(new.email)) = lower(own_email) then
    raise exception 'You cannot add yourself as a contact'
      using errcode = 'invalid_parameter_value';
  end if;

  -- An explicitly supplied link wins, so callers that already know the id
  -- (and the tests) keep working unchanged.
  if new.contact_user_id is null and new.email is not null then
    select id into new.contact_user_id
    from public.profiles
    where lower(email) = lower(trim(new.email))
      and id <> new.owner_id;
  end if;

  return new;
end;
$$;

create trigger contacts_link_account
  before insert or update of email on public.contacts
  for each row execute function public.link_contact_to_account();

-- ---------------------------------------------------------------------------
-- Late joiners
-- ---------------------------------------------------------------------------
-- Someone may be added as a contact before they have an account. Without this,
-- that contact stays permanently unlinked even after they join, and the pair
-- silently cannot lend to each other.

create or replace function public.link_pending_contacts()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.contacts
     set contact_user_id = new.id
   where contact_user_id is null
     and owner_id <> new.id
     and lower(email) = lower(new.email);

  return new;
end;
$$;

create trigger profiles_link_pending_contacts
  after insert on public.profiles
  for each row execute function public.link_pending_contacts();
