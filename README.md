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
npm run test:rls  # access-control tests against a throwaway Postgres
```

`test:rls` downloads and runs a temporary Postgres, applies the migrations,
and asserts that users cannot read or alter each other's data. **Run it after
any change under `supabase/`.** These policies are the only thing separating
one person's debts from another person's view of them.

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

## Editing in Lovable

This project began as a Lovable prototype and syncs with Lovable through
GitHub in both directions: Lovable's edits are committed to the repo, and
pushes here are reflected back into Lovable.

**Lovable's agent should not edit `supabase/`.** It regenerates files it
believes it owns, and a rewritten RLS policy is a data leak rather than a
visual regression. Keep Lovable to UI work. If something under `supabase/`
does change, `npm run test:rls` is what catches it.

## Deploying

Via Lovable: Share → Publish. Custom domains are under Project → Settings →
Domains.
