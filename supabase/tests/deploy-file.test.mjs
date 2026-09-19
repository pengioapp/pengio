// Applies a deploy file to a throwaway database exactly as the Supabase SQL
// editor would, so "it failed to run" can be traced to the file or ruled out.
//
// Migrations up to (but excluding) the counter_proposal function are applied
// first, reproducing the state the live database is actually in.
import EmbeddedPostgres from 'embedded-postgres';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const MIGRATIONS = new URL('../migrations', import.meta.url).pathname;
const DEPLOY = new URL('../deploy/counter_proposal_only.sql', import.meta.url).pathname;

const pg = new EmbeddedPostgres({
  databaseDir: '/tmp/pengio-deploy-test', user: 'postgres', password: 'postgres',
  port: 54997, persistent: false,
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

// Everything except the file under test -- this is the live database's state.
const applied = readdirSync(MIGRATIONS)
  .filter(f => f.endsWith('.sql') && !f.includes('counter_proposal_fn'))
  .sort();

for (const f of applied) {
  await db.query(readFileSync(join(MIGRATIONS, f), 'utf8'));
}
console.log(`baseline: applied ${applied.length} migrations`);

const exists = async () => (await db.query(
  `select 1 from pg_proc where proname = 'counter_proposal'`
)).rowCount > 0;

console.log(`counter_proposal present before: ${await exists()}`);

let failed = false;
try {
  await db.query(readFileSync(DEPLOY, 'utf8'));
  console.log('deploy file ran without error');
} catch (e) {
  failed = true;
  console.error(`DEPLOY FILE FAILED: ${e.message}`);
  if (e.position) console.error(`  at character ${e.position}`);
}

console.log(`counter_proposal present after:  ${await exists()}`);

// Running it a second time must also work -- Bai may well re-run it if he is
// unsure whether the first attempt took.
try {
  await db.query(readFileSync(DEPLOY, 'utf8'));
  console.log('second run also clean (safe to re-run)');
} catch (e) {
  failed = true;
  console.error(`SECOND RUN FAILED: ${e.message}`);
}

await db.end();
await pg.stop();
process.exit(failed ? 1 : 0);
