#!/usr/bin/env node
/* Loads seed data and sets real bcrypt password hashes. */
require('dotenv').config();
const fs = require('fs'), path = require('path');
const { Client } = require('pg');
const bcrypt = require('bcryptjs');

const ROOT = path.resolve(__dirname, '../..');
const PASSWORD = process.env.SEED_PASSWORD || 'Password123!';
const cfg = require('./db-config');

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

  // seed.sql writes phone hashes with a literal development pepper, but the
  // API hashes lookups with HASH_PEPPER at runtime. Recompute them here so
  // patient search by phone finds seeded patients on any deployment.
  const pepper = process.env.HASH_PEPPER || 'dev-pepper';
  const p = await c.query(
    `UPDATE patient
        SET phone_primary_hash =
              encode(digest($1 || convert_from(phone_primary_enc, 'UTF8'), 'sha256'), 'hex')
      WHERE phone_primary_enc IS NOT NULL`,
    [pepper],
  );

  console.log(`Seeded. ${r.rowCount} users (password: ${PASSWORD}), `
    + `${p.rowCount} patient phone hashes bound to the configured pepper.`);
  await c.end();
})().catch(e => { console.error('Seed failed:', e.message); process.exit(1); });
