#!/usr/bin/env node
/* Applies db/migrations/*.sql in order, then optionally db/seed/seed.sql */
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
  const dir = path.join(ROOT, 'db/migrations');
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.sql')).sort();
  for (const f of files) {
    process.stdout.write(`  applying ${f} ... `);
    await c.query(fs.readFileSync(path.join(dir, f), 'utf8'));
    console.log('ok');
  }
  await c.end();
  console.log('Migrations complete.');
})().catch(e => { console.error('Migration failed:', e.message); process.exit(1); });
