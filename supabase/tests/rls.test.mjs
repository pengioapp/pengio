// Adversarial tests for the Pengio schema. Each case asks: can a user reach
// data or perform a transition they should not be able to?
import EmbeddedPostgres from 'embedded-postgres';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const MIGRATIONS = new URL('../migrations', import.meta.url).pathname;

const pg = new EmbeddedPostgres({
  databaseDir: '/tmp/pengio-rls-test', user: 'postgres', password: 'postgres',
  port: 54998, persistent: false,
});
await pg.initialise();
await pg.start();
const db = pg.getPgClient();
await db.connect();

await db.query(`
  create schema if not exists auth;
  create table auth.users (
    id uuid primary key default gen_random_uuid(),
    email text not null, raw_user_meta_data jsonb default '{}'::jsonb
  );
  create role authenticated;
  create or replace function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
  $$;
`);

for (const f of readdirSync(MIGRATIONS).filter(f => f.endsWith('.sql')).sort()) {
  await db.query(readFileSync(join(MIGRATIONS, f), 'utf8'));
}

// Supabase grants these automatically to the authenticated role.
await db.query(`
  grant usage on schema public to authenticated;
  grant select, insert, update, delete on all tables in schema public to authenticated;
  grant execute on all functions in schema public to authenticated;
`);

const uid = async (email, name) => {
  const r = await db.query(
    `insert into auth.users (email, raw_user_meta_data) values ($1, $2) returning id`,
    [email, JSON.stringify({ full_name: name })]
  );
  return r.rows[0].id;
};

const anna = await uid('anna@test.com', 'Anna Kristoffersen');
const erik = await uid('erik@test.com', 'Erik Johansen');
const mallory = await uid('mallory@test.com', 'Mallory Snoop');

// Act as a given user, with RLS enforced.
async function as(user, fn) {
  await db.query(`set role authenticated`);
  await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [user]);
  try { return await fn(); }
  finally { await db.query(`reset role`); }
}

let pass = 0, fail = 0;
const check = (desc, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${desc}${ok || !detail ? '' : `\n        ${detail}`}`);
  ok ? pass++ : fail++;
};
// Asserts an operation is rejected. A test that passes because of a typo in the
// SQL rather than the policy is worse than no test, so the error is returned
// for inspection.
const denied = async (fn) => {
  try { await fn(); return { denied: false, msg: 'operation succeeded' }; }
  catch (e) { return { denied: true, msg: e.message }; }
};

console.log('\n--- profile visibility ---');
const trigger = await db.query(`select count(*)::int n from public.profiles`);
check('signup trigger created a profile per user', trigger.rows[0].n === 3, `got ${trigger.rows[0].n}`);

await as(anna, async () => {
  const r = await db.query(`select id from public.profiles`);
  check('a user with no contacts sees only themselves',
    r.rows.length === 1 && r.rows[0].id === anna, `saw ${r.rows.length} profiles`);
});

// Anna adds Erik. Now they can see each other.
await as(anna, () => db.query(
  `insert into public.contacts (owner_id, contact_user_id, display_name, email)
   values ($1, $2, 'Erik Johansen', 'erik@test.com')`, [anna, erik]));

await as(anna, async () => {
  const r = await db.query(`select id from public.profiles`);
  check('adding a contact reveals that contact', r.rows.length === 2, `saw ${r.rows.length}`);
});
await as(erik, async () => {
  const r = await db.query(`select id from public.profiles`);
  check('visibility is mutual once either side adds the other', r.rows.length === 2, `saw ${r.rows.length}`);
});
await as(mallory, async () => {
  const r = await db.query(`select id from public.profiles`);
  check('an unrelated user sees nobody else', r.rows.length === 1, `saw ${r.rows.length}`);
});

await as(mallory, async () => {
  const d = await denied(() => db.query(
    `update public.profiles set full_name = 'Pwned' where id = $1`, [anna]));
  const r = await db.query(`select full_name from public.profiles where id = $1`, [anna]);
  check('a user cannot rename someone else', r.rows.length === 0 || r.rows[0].full_name !== 'Pwned');
});

console.log('\n--- proposals ---');
let proposalId;
await as(anna, async () => {
  const r = await db.query(
    `insert into public.loan_proposals (borrower_id, lender_id, initiated_by, amount, interest_percent, repayment_date, message)
     values ($1, $2, $1, 2000, 5, '2026-09-28', 'Rent this month') returning id`, [anna, erik]);
  proposalId = r.rows[0].id;
  check('a borrower can request a loan', !!proposalId);
});

await as(mallory, async () => {
  const r = await db.query(`select id from public.loan_proposals`);
  check('a third party cannot see the proposal', r.rows.length === 0, `saw ${r.rows.length}`);
});

await as(mallory, async () => {
  const d = await denied(() => db.query(
    `insert into public.loan_proposals (borrower_id, lender_id, initiated_by, amount, repayment_date)
     values ($1, $2, $1, 99999, '2026-12-01')`, [anna, erik]));
  check('a user cannot forge a debt between two other people', d.denied, d.msg);
});

// Mallory is a party here and names herself as initiator, so the ownership
// checks pass. She should still be stopped, because she and Anna are strangers.
await as(mallory, async () => {
  const d = await denied(() => db.query(
    `insert into public.loan_proposals (borrower_id, lender_id, initiated_by, amount, repayment_date)
     values ($1, $2, $2, 99999, '2026-12-01')`, [anna, mallory]));
  check('a stranger cannot send an unsolicited loan offer', d.denied, d.msg);
});

await as(anna, async () => {
  const d = await denied(() => db.query(`select public.respond_to_proposal($1, true)`, [proposalId]));
  check('the initiator cannot accept their own proposal', d.denied, d.msg);
});

await as(mallory, async () => {
  const d = await denied(() => db.query(`select public.respond_to_proposal($1, true)`, [proposalId]));
  check('an outsider cannot accept a proposal', d.denied, d.msg);
});

console.log('\n--- accepting creates a loan ---');
let loanId;
await as(erik, async () => {
  const r = await db.query(`select public.respond_to_proposal($1, true) as id`, [proposalId]);
  loanId = r.rows[0].id;
  check('the recipient can accept', !!loanId);
});

await as(erik, async () => {
  const r = await db.query(`select principal, interest_percent from public.loans where id = $1`, [loanId]);
  check('loan carries the agreed terms',
    r.rows.length === 1 && Number(r.rows[0].principal) === 2000 && Number(r.rows[0].interest_percent) === 5,
    JSON.stringify(r.rows[0]));
});

await as(erik, async () => {
  const d = await denied(() => db.query(`select public.respond_to_proposal($1, true)`, [proposalId]));
  check('a proposal cannot be accepted twice', d.denied, d.msg);
});

await as(mallory, async () => {
  const r = await db.query(`select id from public.loans`);
  check('a third party cannot see the loan', r.rows.length === 0, `saw ${r.rows.length}`);
});

await as(erik, async () => {
  const d = await denied(() => db.query(
    `update public.loans set principal = 1 where id = $1`, [loanId]));
  const r = await db.query(`select principal from public.loans where id = $1`, [loanId]);
  check('agreed terms cannot be rewritten afterwards', Number(r.rows[0].principal) === 2000,
    `principal is now ${r.rows[0].principal}`);
});

console.log('\n--- repayment ---');
const due = await db.query(`select public.loan_total_due(l) as d from public.loans l where id = $1`, [loanId]);
check('total due applies the surcharge (2000 + 5% = 2100)', Number(due.rows[0].d) === 2100, `got ${due.rows[0].d}`);

let payId;
await as(anna, async () => {
  const r = await db.query(
    `insert into public.payments (loan_id, amount, recorded_by) values ($1, 600, $2) returning id, confirmed_at`,
    [loanId, anna]);
  payId = r.rows[0].id;
  check('a borrower-recorded payment starts unconfirmed', r.rows[0].confirmed_at === null);
});

const bal1 = await db.query(`select public.loan_amount_repaid($1) as r`, [loanId]);
check('unconfirmed payments do not reduce the balance', Number(bal1.rows[0].r) === 0, `got ${bal1.rows[0].r}`);

// The trigger must overwrite client-supplied confirmation, not trust it.
await as(anna, async () => {
  const r = await db.query(
    `insert into public.payments (loan_id, amount, recorded_by, confirmed_at, confirmed_by)
     values ($1, 1, $2, now(), $2) returning id, confirmed_at`, [loanId, anna]);
  check('a borrower cannot pre-confirm a payment by supplying the column',
    r.rows[0].confirmed_at === null, `confirmed_at=${r.rows[0].confirmed_at}`);

  await db.query(`delete from public.payments where id = $1`, [r.rows[0].id]);
  const gone = await db.query(`select id from public.payments where id = $1`, [r.rows[0].id]);
  check('a mistyped payment can be withdrawn while unconfirmed', gone.rows.length === 0);
});


await as(anna, async () => {
  const d = await denied(() => db.query(`select public.confirm_payment($1)`, [payId]));
  check('a borrower cannot confirm their own payment', d.denied, d.msg);
});

await as(mallory, async () => {
  const d = await denied(() => db.query(`select public.confirm_payment($1)`, [payId]));
  check('an outsider cannot confirm a payment', d.denied, d.msg);
});

await as(erik, async () => {
  await db.query(`select public.confirm_payment($1)`, [payId]);
  const r = await db.query(`select public.loan_amount_repaid($1) as r`, [loanId]);
  check('confirming credits the balance', Number(r.rows[0].r) === 600, `got ${r.rows[0].r}`);
});

// Now that Erik has confirmed it, Anna can no longer take it back. RLS filters
// DELETE silently rather than raising, so the assertion is that the row
// survives -- not that an error was thrown.
await as(anna, async () => {
  await db.query(`delete from public.payments where id = $1`, [payId]);
});
const survived = await db.query(`select id from public.payments where id = $1`, [payId]);
check('a confirmed payment cannot be withdrawn by its recorder', survived.rows.length === 1);

await as(erik, async () => {
  const r = await db.query(
    `insert into public.payments (loan_id, amount, recorded_by) values ($1, 500, $2) returning confirmed_at`,
    [loanId, erik]);
  check('a lender-recorded payment is self-confirming', r.rows[0].confirmed_at !== null);
});

// 600 + 500 + 900 = 2000 against a total due of 2100, so 100 is still owed.
await as(erik, async () => {
  await db.query(`insert into public.payments (loan_id, amount, recorded_by) values ($1, 900, $2)`, [loanId, erik]);
  const r = await db.query(`select status from public.loans where id = $1`, [loanId]);
  check('loan stays active while a balance remains', r.rows[0].status === 'active', `status=${r.rows[0].status}`);
});

await as(erik, async () => {
  await db.query(`insert into public.payments (loan_id, amount, recorded_by) values ($1, 100, $2)`, [loanId, erik]);
  const r = await db.query(`select status, closed_at from public.loans where id = $1`, [loanId]);
  check('loan closes itself when fully repaid', r.rows[0].status === 'repaid' && r.rows[0].closed_at !== null,
    `status=${r.rows[0].status}`);
});

console.log('\n--- notifications ---');
await as(erik, async () => {
  const r = await db.query(`select type from public.notifications order by created_at`);
  check('the lender was notified of the request',
    r.rows.some(x => x.type === 'proposal_received'), JSON.stringify(r.rows.map(x => x.type)));
});
await as(mallory, async () => {
  const r = await db.query(`select id from public.notifications`);
  check('notifications are private to their owner', r.rows.length === 0, `saw ${r.rows.length}`);
});

console.log('\n--- constraints ---');
await as(anna, async () => {
  const d = await denied(() => db.query(
    `insert into public.loan_proposals (borrower_id, lender_id, initiated_by, amount, repayment_date)
     values ($1, $1, $1, 100, '2026-12-01')`, [anna]));
  check('a user cannot lend to themselves', d.denied, d.msg);
});
await as(anna, async () => {
  const d = await denied(() => db.query(
    `insert into public.loan_proposals (borrower_id, lender_id, initiated_by, amount, repayment_date)
     values ($1, $2, $1, -500, '2026-12-01')`, [anna, erik]));
  check('a negative amount is rejected', d.denied, d.msg);
});


console.log('\n--- counter-offers ---');
let counterId;
let originalId;

await as(anna, async () => {
  const r = await db.query(
    `insert into public.loan_proposals (borrower_id, lender_id, initiated_by, amount, interest_percent, repayment_date, message)
     values ($1, $2, $1, 3000, 8, '2026-11-01', 'Can you help?') returning id`, [anna, erik]);
  originalId = r.rows[0].id;
  check('a fresh proposal can be raised for countering', !!originalId);
});

await as(anna, async () => {
  const d = await denied(() => db.query(
    `select public.counter_proposal($1, 3000, 4, '2026-11-01')`, [originalId]));
  check('the initiator cannot counter their own proposal', d.denied, d.msg);
});

await as(mallory, async () => {
  const d = await denied(() => db.query(
    `select public.counter_proposal($1, 3000, 4, '2026-11-01')`, [originalId]));
  check('an outsider cannot counter', d.denied, d.msg);
});

await as(erik, async () => {
  const d = await denied(() => db.query(
    `select public.counter_proposal($1, -100, 4, '2026-11-01')`, [originalId]));
  check('a counter with a negative amount is rejected', d.denied, d.msg);
});

await as(erik, async () => {
  const r = await db.query(
    `select public.counter_proposal($1, 3000, 4, '2026-11-15', 'I can do 4%') as id`, [originalId]);
  counterId = r.rows[0].id;
  check('the recipient can counter', !!counterId);
});

{
  const orig = await db.query(`select status, responded_at from public.loan_proposals where id = $1`, [originalId]);
  check('the original is marked countered',
    orig.rows[0].status === 'countered' && orig.rows[0].responded_at !== null,
    JSON.stringify(orig.rows[0]));

  const c = await db.query(
    `select borrower_id, lender_id, initiated_by, amount, interest_percent, counter_to,
            public.proposal_kind(p) as kind
     from public.loan_proposals p where id = $1`, [counterId]);
  const row = c.rows[0];
  check('the counter keeps both parties', row.borrower_id === anna && row.lender_id === erik);
  check('the counter flips the initiator', row.initiated_by === erik);
  check('a countered request becomes an offer', row.kind === 'offer', `kind=${row.kind}`);
  check('the counter carries the new terms',
    Number(row.amount) === 3000 && Number(row.interest_percent) === 4);
  check('the counter links back to the original', row.counter_to === originalId);
}

await as(erik, async () => {
  const d = await denied(() => db.query(
    `select public.counter_proposal($1, 3000, 2, '2026-11-15')`, [originalId]));
  check('a proposal cannot be countered twice', d.denied, d.msg);
});

await as(erik, async () => {
  const d = await denied(() => db.query(`select public.respond_to_proposal($1, true)`, [counterId]));
  check('the counter-offerer cannot accept their own counter', d.denied, d.msg);
});

await as(mallory, async () => {
  const r = await db.query(`select id from public.loan_proposals where id = $1`, [counterId]);
  check('a third party cannot see the counter', r.rows.length === 0, `saw ${r.rows.length}`);
});

await as(anna, async () => {
  const r = await db.query(`select type from public.notifications where proposal_id = $1`, [counterId]);
  check('the original proposer is told it was countered',
    r.rows.some((x) => x.type === 'proposal_countered'), JSON.stringify(r.rows.map(x => x.type)));
});

await as(anna, async () => {
  const r = await db.query(`select public.respond_to_proposal($1, true) as id`, [counterId]);
  check('accepting a counter creates the loan', !!r.rows[0].id);
  const l = await db.query(`select principal, interest_percent from public.loans where id = $1`, [r.rows[0].id]);
  check('the loan uses the countered terms',
    Number(l.rows[0].principal) === 3000 && Number(l.rows[0].interest_percent) === 4,
    JSON.stringify(l.rows[0]));
});

console.log(`\n${pass} passed, ${fail} failed`);
await db.end();
await pg.stop();
process.exit(fail ? 1 : 0);
