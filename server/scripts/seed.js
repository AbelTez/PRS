#!/usr/bin/env node
/* Loads seed data and sets real bcrypt password hashes. */
require('dotenv').config();
const fs = require('fs'), path = require('path');
const { Client } = require('pg');
const bcrypt = require('bcryptjs');

const ROOT = path.resolve(__dirname, '../..');
const PASSWORD = process.env.SEED_PASSWORD || 'Password123!';
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
  const existing = await c.query('SELECT count(*)::int n FROM facility');
  if (existing.rows[0].n > 0 && !process.argv.includes('--force')) {
    console.log('Seed data already present. Use --force to reload (this TRUNCATES).');
    await c.end();
    return;
  }
  if (process.argv.includes('--force')) {
    await c.query(`TRUNCATE referral_feedback, referral_transition, referral_attachment,
                            notification, referral,
                            patient, facility_capacity, facility_capability, app_user,
                            facility, reason_code, capability, admin_unit, audit_log,
                            change_log, sync_cursor, config RESTART IDENTITY CASCADE`);
  }
  await c.query(fs.readFileSync(path.join(ROOT, 'db/seed/seed.sql'), 'utf8'));
  const hash = await bcrypt.hash(PASSWORD, 10);
  const r = await c.query('UPDATE app_user SET password_hash = $1', [hash]);
  console.log(`Seeded. ${r.rowCount} users, password: ${PASSWORD}`);
  await c.end();
})().catch(e => { console.error('Seed failed:', e.message); process.exit(1); });
