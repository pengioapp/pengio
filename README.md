# Pengio

An app for lending and borrowing money between people who trust each other.

## Scope

**Pengio records agreements. It never holds or moves money.**

Settlement happens outside the app — Vipps, bank transfer, cash — and users
record it here. This is a deliberate boundary, not a missing feature: moving
money on someone's behalf is a licensed activity under Finanstilsynet in
Norway, and would pull in KYC/AML obligations and PSD2 compliance.

Nothing in this codebase should assume custody of funds.

## Stack

- Vite + React + TypeScript, Tailwind, shadcn/ui
- Supabase for database and authentication
- Postgres row level security for access control

## Running locally

Requires Node 20 or newer.

```sh
npm install
cp .env.example .env   # fill in from Supabase: Project Settings -> API keys
npm run dev
```

## Tests

```sh
npm test          # unit tests
npm run test:rls  # access control, against a throwaway local Postgres
npm run test:e2e  # full flow, against the live Supabase project
```

`test:rls` runs a temporary Postgres, applies the migrations, and asserts that
users cannot read or alter each other's data. **Run it after any change under
`supabase/`.** These policies are the only thing separating one person's debts
from another person's view of them.

`test:e2e` drives the same flow through the deployed database using the client
library the app uses — proving the policies are actually live, not just
correct on paper. It creates throwaway accounts each run; delete them from
Authentication → Users. Point it at a development project, never one with real
users.

**`test:e2e` requires «Confirm email» to be off** (Authentication → Sign In /
Providers → Email). It signs accounts up and immediately uses their session,
which email confirmation deliberately prevents. Confirmation should stay *on*
for anything real, so this test only runs against a project configured for
development. It fails with a message naming the setting rather than something
cryptic.

## Database

Migrations live in `supabase/migrations/` and apply in filename order.
`supabase/deploy/full_schema.sql` is those files concatenated, for pasting
into the Supabase SQL editor.

Two modelling decisions worth knowing before changing anything:

**Proposals are one table, not two.** A loan request and a loan offer describe
the same event from opposite ends. `loan_proposals` carries a borrower, a
lender, and whoever initiated it; request-versus-offer is derived, so it can
never contradict the participants.

**Payments are claims, not facts.** Money moves outside the app, so a payment
row is somebody's assertion about the real world. A payment recorded by the
borrower stays unconfirmed until the lender agrees, and unconfirmed payments
never reduce a balance. A payment recorded by the lender self-confirms — it is
a statement against their own interest, so there is nothing to gain by lying.

## Relationship to Lovable

This repository is the source of truth. Lovable produced the original
prototype — 23 designed screens — and remains useful as a visual reference,
but it no longer edits this code.

The decision was forced by a limitation and then confirmed by judgement.
Lovable's Git integration only creates a new repository; it cannot import an
existing one, so a two-way sync with this repo was never available. Given
that, connecting was not worth it: Lovable Cloud wants to own the backend and
provides its own database and auth, which would compete with the Supabase
project this app actually uses. Its agent also regenerates files it believes
it owns, and a rewritten RLS policy is a data leak rather than a visual
regression.

Removed as part of that decision:

- `lovable-tagger` — tagged components for Lovable's visual editor
- `mcpPlugin` in `vite.config.ts` — regenerated `supabase/functions/mcp/`
  on every build, producing spurious diffs in tracked files
- `.lovable/` — Lovable's own scratch state

### The MCP endpoint

`src/lib/mcp/` is kept, but nothing builds or deploys it any more.

It defined four read-only tools over the demo dataset, exposed as a **public,
unauthenticated** endpoint (`"auth": {"type": "none"}`). That was harmless
while it served hardcoded mock data. It would not be harmless pointed at the
real tables: it would be an open door to who owes whom.

If you revive it, give it authentication first, and make the tools respect the
caller's identity rather than reading with elevated privileges.

## Where the app stands

Working end to end against the database: sign-up and sign-in, contacts,
proposing a loan in either direction, accepting or declining, recording a
repayment, confirming one, and automatic closure when a loan is fully repaid.

No screen renders invented data. That mattered more than it sounds: the
prototype's loan detail screen derived an outstanding balance as 24 % of the
principal for every loan, and the summary screen reported a fixed 17 500 kr
lent and 4.2 % interest regardless of what was owed.

Not built yet:

- Counter-offers. Terms cannot be edited at approval, because doing so and
  calling it agreement binds the other party to something they never proposed.
  Changing terms should be a new proposal the other side accepts.
- Deleting an account. It has to decide what happens to a counterparty's
  record of a shared loan, so it needs a retention rule before it is offered.
- Reminders. `repayment_due_soon` exists in the notification enum but nothing
  emits it; that needs a scheduled job.

## Deploying

Not yet configured. The Lovable-hosted preview no longer reflects this
codebase.
