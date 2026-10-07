#!/usr/bin/env node
// Additive synthetic fixtures. Never truncate tables or update existing accounts.
const { Client } = require('pg');
const bcrypt = require('bcryptjs');
const id = (prefix, n) => `${prefix}-0000-0000-0000-${n.toString(16).padStart(12, '0')}`;
const facilities = [1, 2, 18].map(n => id('22222222', n));
const doctors = [
  ['demo.hana', '[Test doctor] Dr Hana Tesfaye', 'Cardiology', 0],
  ['demo.dawit', '[Test doctor] Dr Dawit Alemu', 'Neurology', 0],
  ['demo.sara', '[Test doctor] Dr Sara Bekele', 'Paediatrics', 1],
  ['demo.kebede', '[Test doctor] Dr Kebede Tadesse', 'Internal Medicine', 1],
  ['demo.meron', '[Test doctor] Dr Meron Hailu', 'Cardiology', 2],
  ['demo.yonas', '[Test doctor] Dr Yonas Assefa', 'General Surgery', 2],
].map(([username, full_name, department, facility], i) => ({
  id: id('33333333', 0x101+i), username, full_name, department, facility_id: facilities[facility],
}));
const owners = [10, 7, 13].map(n => id('33333333', n)); // Tigist, Abdi, Samuel
const patients = facilities.flatMap((facility_id, f) => [
  ['Sample Aster', 'Tesfaye', 'female', 34],
  ['Sample Bekele', 'Hailu', 'male', 52],
  ['Sample Selam', 'Dawit', 'female', 8],
].map(([given_name_lat, fathers_name_lat, sex, age_value], i) => ({
  id: id('55555555', 0x101+f*3+i), given_name_lat, fathers_name_lat, sex, age_value,
  created_by: owners[f], facility_id,
})));

async function seedConsultations(client, password = process.env.SEED_PASSWORD || 'Password123!') {
  const hash = await bcrypt.hash(password, 10);
  await client.query('BEGIN');
  try {
    await client.query('SELECT pg_advisory_xact_lock(73021, 5)');
    const prerequisites = await client.query(`SELECT u.id,u.facility_id FROM app_user u
      JOIN facility f ON f.id=u.facility_id WHERE u.id=ANY($1::uuid[]) AND f.status='active'`, [owners]);
    if (!owners.every((owner,i) => prerequisites.rows.some(r => r.id===owner && r.facility_id===facilities[i]))) {
      throw new Error('Expected pilot facilities and doctors are missing; no sample records were inserted.');
    }
    // Fail on ID/username collisions rather than modifying an unrelated account.
    const conflicts = await client.query(`SELECT u.id FROM app_user u
      JOIN jsonb_to_recordset($1::jsonb) AS d(id uuid,username text)
      ON u.id=d.id OR u.username=d.username
      WHERE u.id<>d.id OR u.username<>d.username`, [JSON.stringify(doctors)]);
    if (conflicts.rowCount) throw new Error('Sample account identifiers conflict with an existing account.');
    const users = await client.query(`INSERT INTO app_user
      (id,username,password_hash,full_name,role,facility_id,title,department,license_number,status,verified_at)
      SELECT id,username,$2,full_name,'specialist',facility_id,department || ' specialist',department,
        'DEMO-ONLY-' || username,'active',now()
      FROM jsonb_to_recordset($1::jsonb) AS d(id uuid,username text,full_name text,department text,facility_id uuid)
      ON CONFLICT (id) DO NOTHING`, [JSON.stringify(doctors),hash]);
    const people = await client.query(`INSERT INTO patient
      (id,given_name_lat,fathers_name_lat,name_search,sex,age_value,age_unit,is_test_data,created_by)
      SELECT id,given_name_lat,fathers_name_lat,concat_ws(' ',given_name_lat,fathers_name_lat),sex,age_value,'years',true,created_by
      FROM jsonb_to_recordset($1::jsonb) AS p(id uuid,given_name_lat text,fathers_name_lat text,sex text,age_value smallint,created_by uuid)
      ON CONFLICT (id) DO NOTHING`, [JSON.stringify(patients)]);
    await client.query('COMMIT');
    return { doctorsAdded: users.rowCount, patientsAdded: people.rowCount };
  } catch (error) { await client.query('ROLLBACK'); throw error; }
}
module.exports = { seedConsultations };
if (require.main === module) {
  const cfg = require('./db-config');
  if (!['localhost','127.0.0.1','::1'].includes(cfg.host) && !process.argv.includes('--allow-remote')) {
    throw new Error('Remote sample seeding requires --allow-remote. This creates synthetic demo accounts and patients.');
  }
  const client = new Client(cfg);
  (async () => {
    await client.connect();
    try { console.log('Consultation sample data:', await seedConsultations(client)); }
    finally { await client.end(); }
  })().catch(error => { console.error('Sample seed failed:', error.message); process.exitCode=1; });
}
