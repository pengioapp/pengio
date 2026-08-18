// End-to-end check against the live Supabase project, driven through the same
// client library the app uses. The local RLS suite (rls.test.mjs) proves the
// policies are correct against a throwaway Postgres; this proves the deployed
// database actually has them, and that auth is wired up.
//
// Creates throwaway accounts. Run against a development project, never one
// with real users. Delete the accounts afterwards from Authentication -> Users.
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

const env = Object.fromEntries(
  readFileSync(new URL('../../.env', import.meta.url), 'utf8')
    .split('\n')
    .filter((l) => l.includes('='))
    .map((l) => {
      const [k, ...rest] = l.split('=');
      return [k.trim(), rest.join('=').trim().replace(/^"|"$/g, '')];
    })
);

const URL_ = env.VITE_SUPABASE_URL;
const KEY = env.VITE_SUPABASE_PUBLISHABLE_KEY;

// A fresh run each time, so a previous failure never leaves state that makes
// the next run pass for the wrong reason.
const stamp = Date.now();
const client = () => createClient(URL_, KEY, { auth: { persistSession: false } });

let pass = 0, fail = 0;
const check = (desc, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${desc}${ok || !detail ? '' : `\n        ${detail}`}`);
  ok ? pass++ : fail++;
};

async function signUp(label, name) {
  const sb = client();
  const email = `pengio-e2e-${label}-${stamp}@mailinator.com`;
  const { data, error } = await sb.auth.signUp({
    email,
    password: `E2E-${stamp}-xK9`,
    options: { data: { full_name: name } },
  });
  if (error) throw new Error(`signup ${label}: ${error.message}`);
  if (!data.session) throw new Error(`signup ${label}: no session -- is "Confirm email" still on?`);
  return { sb, id: data.user.id, email, name };
}

console.log('--- signup and the profile trigger ---');
const anna = await signUp('anna', 'Anna Testesen');
const erik = await signUp('erik', 'Erik Testesen');
const mallory = await signUp('mallory', 'Mallory Snoop');
check('three accounts created with sessions', !!(anna.id && erik.id && mallory.id));

const { data: annaProfile } = await anna.sb
  .from('profiles').select('full_name, email').eq('id', anna.id).maybeSingle();
check('signup trigger created the profile row', annaProfile?.full_name === 'Anna Testesen',
  JSON.stringify(annaProfile));

console.log('\n--- profile visibility ---');
const { data: annaSees } = await anna.sb.from('profiles').select('id');
check('a new user sees only themselves', annaSees?.length === 1, `saw ${annaSees?.length}`);

// By email only, exactly as the app does. Supplying contact_user_id here is
// what hid a total failure of this flow: the client cannot look that id up,
// because row level security hides the profile until the two are connected.
const { data: addedContact, error: contactError } = await anna.sb
  .from('contacts')
  .insert({ owner_id: anna.id, display_name: erik.name, email: erik.email })
  .select('contact_user_id')
  .single();

check('adding a contact by email links the account',
  addedContact?.contact_user_id === erik.id,
  contactError?.message ?? `got ${addedContact?.contact_user_id}`);

const { data: erikSees } = await erik.sb.from('profiles').select('id');
check('visibility becomes mutual once either side adds the other',
  erikSees?.length === 2, `saw ${erikSees?.length}`);

const { data: mallorySees } = await mallory.sb.from('profiles').select('id');
check('an unrelated user still sees only themselves',
  mallorySees?.length === 1, `saw ${mallorySees?.length}`);

console.log('\n--- proposals ---');
const { data: proposal, error: pErr } = await anna.sb.from('loan_proposals').insert({
  borrower_id: anna.id, lender_id: erik.id, initiated_by: anna.id,
  amount: 2000, interest_percent: 5, repayment_date: '2026-12-01',
  message: 'Rent this month',
}).select().single();
check('a borrower can request a loan from a contact', !!proposal, pErr?.message);

const { error: strangerErr } = await mallory.sb.from('loan_proposals').insert({
  borrower_id: anna.id, lender_id: mallory.id, initiated_by: mallory.id,
  amount: 99999, repayment_date: '2026-12-01',
});
check('a stranger cannot push a loan offer at someone', !!strangerErr, strangerErr?.message);

const { data: malloryProposals } = await mallory.sb.from('loan_proposals').select('id');
check('a third party cannot see the proposal',
  malloryProposals?.length === 0, `saw ${malloryProposals?.length}`);

const { error: selfAcceptErr } = await anna.sb.rpc('respond_to_proposal', {
  proposal: proposal.id, accept: true,
});
check('the initiator cannot accept their own proposal', !!selfAcceptErr, selfAcceptErr?.message);

console.log('\n--- accepting creates a loan ---');
const { data: loanId, error: acceptErr } = await erik.sb.rpc('respond_to_proposal', {
  proposal: proposal.id, accept: true,
});
check('the recipient can accept', !!loanId, acceptErr?.message);

const { data: loan } = await erik.sb.from('loans')
  .select('principal, interest_percent, status').eq('id', loanId).maybeSingle();
check('the loan carries the agreed terms',
  Number(loan?.principal) === 2000 && Number(loan?.interest_percent) === 5,
  JSON.stringify(loan));

const { error: editErr } = await erik.sb.from('loans')
  .update({ principal: 1 }).eq('id', loanId);
const { data: loanAfter } = await erik.sb.from('loans')
  .select('principal').eq('id', loanId).maybeSingle();
check('agreed terms cannot be rewritten afterwards',
  Number(loanAfter?.principal) === 2000, `principal is now ${loanAfter?.principal}`);

const { data: malloryLoans } = await mallory.sb.from('loans').select('id');
check('a third party cannot see the loan', malloryLoans?.length === 0, `saw ${malloryLoans?.length}`);

console.log('\n--- repayment ---');
const { data: payment } = await anna.sb.from('payments')
  .insert({ loan_id: loanId, amount: 600, recorded_by: anna.id })
  .select().single();
check('a borrower-recorded payment starts unconfirmed', payment?.confirmed_at === null);

const { data: repaid1 } = await anna.sb.rpc('loan_amount_repaid', { loan: loanId });
check('unconfirmed payments do not reduce the balance',
  Number(repaid1) === 0, `got ${repaid1}`);

const { error: selfConfirmErr } = await anna.sb.rpc('confirm_payment', { payment: payment.id });
check('a borrower cannot confirm their own payment', !!selfConfirmErr, selfConfirmErr?.message);

await erik.sb.rpc('confirm_payment', { payment: payment.id });
const { data: repaid2 } = await erik.sb.rpc('loan_amount_repaid', { loan: loanId });
check('confirming credits the balance', Number(repaid2) === 600, `got ${repaid2}`);

const { data: lenderPayment } = await erik.sb.from('payments')
  .insert({ loan_id: loanId, amount: 1500, recorded_by: erik.id })
  .select().single();
check('a lender-recorded payment is self-confirming', lenderPayment?.confirmed_at !== null);

// 600 + 1500 = 2100, which is 2000 plus the 5% surcharge.
const { data: closed } = await erik.sb.from('loans')
  .select('status, closed_at').eq('id', loanId).maybeSingle();
check('the loan closes itself when fully repaid',
  closed?.status === 'repaid' && closed?.closed_at !== null, JSON.stringify(closed));

console.log('\n--- notifications ---');
const { data: erikNotes } = await erik.sb.from('notifications').select('type');
check('the lender was notified of the request',
  erikNotes?.some((n) => n.type === 'proposal_received'),
  JSON.stringify(erikNotes?.map((n) => n.type)));

const { data: malloryNotes } = await mallory.sb.from('notifications').select('id');
check('notifications stay private to their owner',
  malloryNotes?.length === 0, `saw ${malloryNotes?.length}`);

console.log(`\n${pass} passed, ${fail} failed`);
console.log(`\nTest accounts to clean up (Authentication -> Users):`);
for (const u of [anna, erik, mallory]) console.log(`  ${u.email}`);

process.exit(fail ? 1 : 0);
