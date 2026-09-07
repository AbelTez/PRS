#!/usr/bin/env node
/* Applies db/migrations/*.sql in order, tracking what has already been applied
 * in a schema_migrations table so the command is safe to re-run. */
require('dotenv').config();
const fs = require('fs'), path = require('path');
const { Client } = require('pg');

const ROOT = path.resolve(__dirname, '../..');
const cfg = {
  host: process.env.PGHOST || '127.0.0.1',
  port: parseInt(process.env.PGPORT || '5432', 10),
  user: process.env.PGUSER || 'erl',
  password: process.env.PGPASSWORD || 'erl',
  database: process.env.PGDATABASE || 'erl_dev',
};

(async () => {
  const c = new Client(cfg);
  await c.connect();
  await c.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    filename   TEXT PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`);
  const done = new Set(
    (await c.query('SELECT filename FROM schema_migrations')).rows.map((r) => r.filename),
  );
  // Legacy databases migrated before tracking existed: 001 is applied iff facility exists.
  if (!done.has('001_init.sql')) {
    const legacy = await c.query(`SELECT to_regclass('public.facility') AS t`);
    if (legacy.rows[0].t) {
      await c.query(`INSERT INTO schema_migrations (filename) VALUES ('001_init.sql') ON CONFLICT DO NOTHING`);
      done.add('001_init.sql');
    }
  }
  const dir = path.join(ROOT, 'db/migrations');
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.sql')).sort();
  let applied = 0;
  for (const f of files) {
    if (done.has(f)) { console.log(`  skipping ${f} (already applied)`); continue; }
    process.stdout.write(`  applying ${f} ... `);
    await c.query('BEGIN');
    try {
      await c.query(fs.readFileSync(path.join(dir, f), 'utf8'));
      await c.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [f]);
      await c.query('COMMIT');
    } catch (e) {
      await c.query('ROLLBACK');
      throw new Error(`${f}: ${e.message}`);
    }
    console.log('ok');
    applied++;
  }
  await c.end();
  console.log(applied ? `Migrations complete (${applied} applied).` : 'Nothing to apply.');
})().catch(e => { console.error('Migration failed:', e.message); process.exit(1); });
