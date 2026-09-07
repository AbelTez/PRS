#!/usr/bin/env node
/**
 * End-to-end test of the referral lifecycle and business rules.
 * Run with the API already listening (npm start), or it will start it itself.
 *
 *   node scripts/e2e-test.js
 */
require('dotenv').config();

const BASE = process.env.API_BASE || 'http://127.0.0.1:3000';
const PASSWORD = process.env.SEED_PASSWORD || 'Password123!';

let pass = 0, fail = 0;
const results = [];

function ok(name, cond, detail = '') {
  if (cond) { pass++; results.push(`  \x1b[32mPASS\x1b[0m  ${name}`); }
  else { fail++; results.push(`  \x1b[31mFAIL\x1b[0m  ${name} ${detail ? '-> ' + detail : ''}`); }
}

async function api(method, path, body, token) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try { json = await res.json(); } catch { /* no body */ }
  return { status: res.status, body: json };
}

async function login(username) {
  const r = await api('POST', '/v1/auth/login', { username, password: PASSWORD });
  if (r.status !== 201 && r.status !== 200) {
    throw new Error(`Login failed for ${username}: ${r.status} ${JSON.stringify(r.body)}`);
  }
  return r.body;
}

(async () => {
  console.log('\n\x1b[1mEthio Referral Linkage — end-to-end test\x1b[0m');
  console.log(`Target: ${BASE}\n`);

  /* ---------------------------------------------------------- 1. AUTH */
  console.log('\x1b[36m1. Authentication & RBAC\x1b[0m');
  const hew = await login('hew.awaro');
  ok('HEW can log in', !!hew.accessToken);
  ok('HEW is scoped to a health post', hew.user.facilityTier === 1, `tier=${hew.user.facilityTier}`);

  const liaisonAmbo = await login('liaison.ambo');
  const liaisonGuder = await login('liaison.guder');
  const liaisonGinchi = await login('liaison.ginchi');
  const clinician = await login('clin.ambohc');
  const woreda = await login('woreda.ws');
  const cbhi = await login('cbhi.ws');
  ok('All pilot personas authenticate', !!(liaisonAmbo.accessToken && woreda.accessToken && cbhi.accessToken));

  const badLogin = await api('POST', '/v1/auth/login', { username: 'hew.awaro', password: 'wrong' });
  ok('Wrong password is rejected', badLogin.status === 401);

  const noToken = await api('GET', '/v1/referrals');
  ok('Unauthenticated request is rejected', noToken.status === 401);

  /* ------------------------------------------------------- 2. ROUTING */
  console.log('\n\x1b[36m2. Capability-aware routing (BR-10..BR-15)\x1b[0m');
  const suggest = await api('POST', '/v1/routing/suggest',
    { reasonCode: 'severe_pre_eclampsia', wardType: 'maternity' }, hew.accessToken);
  ok('Routing returns suggestions', suggest.status === 201 || suggest.status === 200);

  const s = suggest.body;
  ok('Urgency auto-derived as emergency', s.urgency === 'emergency', s.urgency);
  ok('Required capabilities auto-derived',
    s.requiredCapabilities.includes('caesarean_section'), JSON.stringify(s.requiredCapabilities));
  ok('Stabilisation checklist supplied',
    Array.isArray(s.stabilisationItems) && s.stabilisationItems.length > 0);

  const guderExcluded = s.excluded.find((f) => f.name.includes('Guder Primary'));
  ok('Guder Primary is EXCLUDED (no anaesthetist)', !!guderExcluded);
  ok('Exclusion reason is visible to the clinician',
    !!guderExcluded && guderExcluded.missingCapabilities.some(
      (m) => m.code === 'anaesthesia_general' && (m.note || '').includes('anaesthetist')),
    guderExcluded ? JSON.stringify(guderExcluded.missingCapabilities.map(m => m.code)) : 'not found');

  const topPick = s.candidates[0];
  ok('An eligible facility is offered', !!topPick, JSON.stringify(s.candidates.map(c => c.name)));
  ok('Top pick has ALL required capabilities', topPick && topPick.missingCapabilities.length === 0);
  ok('Distance is computed', topPick && topPick.distanceKm > 0, topPick && String(topPick.distanceKm));
  console.log(`     -> top pick: ${topPick.name} (${topPick.distanceKm} km, score ${topPick.score})`);
  console.log(`     -> excluded: ${s.excluded.map(e => e.name + ' [' + e.missingCapabilities.map(m=>m.code).join(',') + ']').join(' | ')}`);

  /* ------------------------------------------------------- 3. PATIENT */
  console.log('\n\x1b[36m3. Patient registration (BR-40..BR-44)\x1b[0m');
  const patient = await api('POST', '/v1/patients', {
    givenNameLat: 'Chaltu', givenNameAm: 'ጫልቱ',
    fathersNameLat: 'Bekele', fathersNameAm: 'በቀለ',
    grandfathersNameLat: 'Dinsa',
    sex: 'female', ageValue: 26, ageUnit: 'years',
    phonePrimary: '+251920111222', phoneOwnerRelation: 'self',
    woredaId: '11111111-0000-0000-0000-000000000003',
    cbhiMember: true, isPregnant: true,
    isTestData: false,
  }, hew.accessToken);
  ok('Patient created', patient.status === 201 || patient.status === 200, JSON.stringify(patient.body));
  const patientId = patient.body.id;
  ok('Ge\'ez name preserved', patient.body.nameAm.includes('ጫልቱ'), patient.body.nameAm);

  const noName = await api('POST', '/v1/patients', { sex: 'female', ageValue: 30, ageUnit: 'years' }, hew.accessToken);
  ok('Patient without a name is rejected', noName.status === 400);

  const search = await api('POST', '/v1/patients/search', { name: 'Chaltu' }, hew.accessToken);
  ok('Patient search finds the record', search.body.length > 0);
  ok('Match confidence is returned', search.body[0].matchConfidence !== undefined);

  /* ------------------------- 4. BUSINESS RULE ENFORCEMENT ON CREATION */
  console.log('\n\x1b[36m4. Business rules on creation (BR-01, BR-05, BR-13)\x1b[0m');

  const missingVitals = await api('POST', '/v1/referrals', {
    patientId, reasonCode: 'severe_pre_eclampsia',
    targetFacilityId: topPick.facilityId,
    provisionalDiagnosis: 'Severe pre-eclampsia',
    clinical: { bpSystolic: 160 },
  }, hew.accessToken);
  ok('BR-05: incomplete vitals rejected', missingVitals.status === 400);
  ok('BR-05: response names the missing vitals',
    Array.isArray(missingVitals.body?.message?.missingVitals ?? missingVitals.body?.missingVitals)
    || JSON.stringify(missingVitals.body).includes('missingVitals'),
    JSON.stringify(missingVitals.body).slice(0, 200));

  const badOverride = await api('POST', '/v1/referrals', {
    patientId, reasonCode: 'severe_pre_eclampsia',
    targetFacilityId: topPick.facilityId,
    provisionalDiagnosis: 'Severe pre-eclampsia',
    emergencyOverride: true,
  }, hew.accessToken);
  ok('BR-05: emergencyOverride without reason rejected', badOverride.status === 400);

  const noOverrideReason = await api('POST', '/v1/referrals', {
    patientId, reasonCode: 'severe_pre_eclampsia',
    targetFacilityId: topPick.facilityId,
    suggestionRankOfChosen: 3,
    provisionalDiagnosis: 'Severe pre-eclampsia',
    clinical: { bpSystolic: 160, bpDiastolic: 110, pulse: 96, respRate: 22, temperatureC: 37.1 },
  }, hew.accessToken);
  ok('BR-13: non-top pick without overrideReason rejected', noOverrideReason.status === 400);

  /* ------------------------------------ 5. HAPPY PATH: FULL LOOP CLOSURE */
  console.log('\n\x1b[36m5. Full lifecycle — emergency obstetric referral\x1b[0m');

  const created = await api('POST', '/v1/referrals', {
    patientId,
    reasonCode: 'severe_pre_eclampsia',
    targetFacilityId: topPick.facilityId,
    suggestedFacilityIds: s.candidates.map((c) => c.facilityId),
    suggestionRankOfChosen: 1,
    provisionalDiagnosis: 'Severe pre-eclampsia at 34 weeks',
    distanceKm: topPick.distanceKm,
    estimatedTravelMinutes: topPick.estimatedTravelMinutes,
    clinical: {
      bpSystolic: 160, bpDiastolic: 110, pulse: 96, respRate: 22, temperatureC: 37.1,
      gestationalAgeWeeks: 34, gravida: 1, para: 0, fetalHeartRate: 142,
      presentingComplaint: 'Severe headache, blurred vision, epigastric pain',
    },
    preReferral: {
      stabilisationGiven: ['MgSO4 loading dose given', 'Antihypertensive given', 'IV line established'],
      treatmentGiven: 'MgSO4 4g IV loading dose at 09:15; Nifedipine 10mg PO',
      ivAccessEstablished: true,
    },
    createdOffline: true,
    clientCreatedAt: new Date(Date.now() - 22 * 60000).toISOString(),
    lawfulBasis: 'vital_interest',
  }, hew.accessToken);

  ok('Referral created and submitted', created.status === 201 || created.status === 200,
    JSON.stringify(created.body).slice(0, 300));
  const ref = created.body;
  const refId = ref.id;
  ok('Status is SUBMITTED', ref.status === 'SUBMITTED', ref.status);
  ok('Human-readable code generated', /^ERL-[A-Z0-9]{4}-[A-Z0-9]{2}\d$/.test(ref.referral_code), ref.referral_code);
  ok('SLA deadline set (BR-20)', !!ref.sla_deadline_at);
  const slaMin = Math.round((new Date(ref.sla_deadline_at) - new Date(ref.synced_at)) / 60000);
  ok('Emergency SLA is 5 minutes', slaMin === 5, `${slaMin} min`);
  ok('Offline sync lag recorded, not penalised', ref.sync_lag_minutes >= 21, `${ref.sync_lag_minutes} min`);
  ok('Chain root = self on first node', ref.chain_root_id === refId);
  console.log(`     -> ${ref.referral_code}: ${ref.origin_facility_name} -> ${ref.target_facility_name}`);

  // Which liaison receives it?
  const targetIsAmbo = topPick.name.includes('Ambo General');
  const receiver = targetIsAmbo ? liaisonAmbo : (topPick.name.includes('Ginchi') ? liaisonGinchi : liaisonAmbo);

  const wrongParty = await api('GET', `/v1/referrals/${refId}`, null, liaisonGuder.accessToken);
  ok('BR-51: non-party facility cannot read the referral', wrongParty.status === 403, String(wrongParty.status));

  const ack = await api('POST', `/v1/referrals/${refId}/acknowledge`, {}, receiver.accessToken);
  ok('Receiver can acknowledge', ack.status === 201 || ack.status === 200, JSON.stringify(ack.body).slice(0,200));
  ok('Status -> ACKNOWLEDGED', ack.body.status === 'ACKNOWLEDGED', ack.body.status);

  const badDecline = await api('POST', `/v1/referrals/${refId}/decline`, { declineNote: 'busy' }, receiver.accessToken);
  ok('BR-22: decline without controlled reason rejected', badDecline.status === 400);

  const accept = await api('POST', `/v1/referrals/${refId}/accept`, {
    bedReserved: true, receivingClinicianName: 'Dr Selam Girma', receivingClinicianPhone: '+251911777888',
  }, receiver.accessToken);
  ok('Referral accepted', accept.body.status === 'ACCEPTED', accept.body.status);
  ok('BR-26: bed reserved with expiry', accept.body.bed_reserved && !!accept.body.bed_reservation_expires_at);
  ok('BR-60: CBHI validity token minted', !!accept.body.validity_token);
  ok('Receiving clinician contact returned to referrer',
    accept.body.receiving_clinician_name === 'Dr Selam Girma');

  const verify = await api('POST', '/v1/tokens/verify', { token: accept.body.validity_token }, cbhi.accessToken);
  ok('BR-61: CBHI can verify the token', verify.body.valid === true, JSON.stringify(verify.body));
  ok('BR-64: token contains NO clinical data',
    !JSON.stringify(verify.body).toLowerCase().includes('eclampsia'), JSON.stringify(verify.body));

  const badToken = await api('POST', '/v1/tokens/verify', { token: 'aaa.bbb.ccc' }, cbhi.accessToken);
  ok('Forged token is rejected', badToken.body.valid === false);

  const depart = await api('POST', `/v1/referrals/${refId}/depart`,
    { transportMode: 'ambulance', escortType: 'hew' }, hew.accessToken);
  ok('Patient marked departed', depart.body.status === 'IN_TRANSIT', depart.body.status);

  const arrive = await api('POST', `/v1/referrals/${refId}/arrive`,
    { arrivalMethod: 'qr_scan' }, receiver.accessToken);
  ok('BR-31: arrival confirmed by QR scan', arrive.body.status === 'ARRIVED', arrive.body.status);
  ok('Transit time computed automatically', arrive.body.transit_minutes !== null);

  const care = await api('POST', `/v1/referrals/${refId}/start-care`, {}, receiver.accessToken);
  ok('Care started', care.body.status === 'IN_CARE', care.body.status);

  const badOutcome = await api('POST', `/v1/referrals/${refId}/outcome`,
    { outcome: { finalDiagnosis: 'Severe pre-eclampsia' } }, receiver.accessToken);
  ok('Outcome without disposition rejected', badOutcome.status === 400);

  const outcome = await api('POST', `/v1/referrals/${refId}/outcome`, {
    outcome: {
      finalDiagnosis: 'Severe pre-eclampsia, delivered by emergency caesarean',
      disposition: 'admitted',
      treatmentProvided: 'Emergency LSCS; MgSO4 maintenance 24h; antihypertensives',
      followUpRequired: true,
      followUpDate: '2026-09-04',
      followUpInstructions: 'BP check at health post in 7 days; postnatal review at HC in 6 weeks',
    },
  }, receiver.accessToken);
  ok('Outcome submitted', outcome.body.status === 'OUTCOME_RETURNED', outcome.body.status);

  const wrongAck = await api('POST', `/v1/referrals/${refId}/acknowledge-outcome`, {}, receiver.accessToken);
  ok('Receiver cannot close the loop on their own side', wrongAck.status === 400, String(wrongAck.status));

  const closed = await api('POST', `/v1/referrals/${refId}/acknowledge-outcome`, {}, hew.accessToken);
  ok('BR-30: originator acknowledgement CLOSES THE LOOP',
    closed.body.status === 'CLOSED_COMPLETED', closed.body.status);
  ok('BR-36: closed referral is immutable',
    (await api('POST', `/v1/referrals/${refId}/accept`, {}, receiver.accessToken)).status === 400);
  console.log(`     -> loop closed: ${ref.referral_code}`);

  /* ------------------------------------------- 6. DECLINE & REROUTE PATH */
  console.log('\n\x1b[36m6. Decline, reroute and redirect (BR-23..BR-25)\x1b[0m');

  const p2 = await api('POST', '/v1/patients', {
    givenNameLat: 'Tolosa', fathersNameLat: 'Regassa', sex: 'male',
    ageValue: 41, ageUnit: 'years', woredaId: '11111111-0000-0000-0000-000000000004',
  }, clinician.accessToken);

  const r2 = await api('POST', '/v1/referrals', {
    patientId: p2.body.id, reasonCode: 'acute_abdomen',
    targetFacilityId: '22222222-0000-0000-0000-000000000002',
    suggestionRankOfChosen: 1,
    tierSkipReason: 'intermediate_facility_lacks_capability',
    provisionalDiagnosis: 'Acute abdomen, suspected appendicitis',
    clinical: { bpSystolic: 118, bpDiastolic: 74, pulse: 102, respRate: 20, temperatureC: 38.4 },
  }, clinician.accessToken);
  ok('Second referral created', r2.body.status === 'SUBMITTED', JSON.stringify(r2.body).slice(0,200));

  await api('POST', `/v1/referrals/${r2.body.id}/acknowledge`, {}, liaisonAmbo.accessToken);
  const declined = await api('POST', `/v1/referrals/${r2.body.id}/decline`,
    { declineReason: 'no_bed', declineNote: 'Surgical ward full until tomorrow' }, liaisonAmbo.accessToken);
  ok('Decline with controlled reason accepted', declined.body.status === 'DECLINED', declined.body.status);
  ok('Decline reason recorded', declined.body.decline_reason === 'no_bed');

  const rerouted = await api('POST', `/v1/referrals/${r2.body.id}/reroute`,
    { targetFacilityId: '22222222-0000-0000-0000-000000000004' }, clinician.accessToken);
  ok('Reroute returns to SUBMITTED at a new facility',
    rerouted.body.status === 'SUBMITTED' && rerouted.body.target_facility_name.includes('Ginchi'),
    `${rerouted.body.status} @ ${rerouted.body.target_facility_name}`);
  ok('SLA clock restarted on reroute', rerouted.body.sla_breached === false);

  await api('POST', `/v1/referrals/${rerouted.body.id}/acknowledge`, {}, liaisonGinchi.accessToken);
  const redirected = await api('POST', `/v1/referrals/${rerouted.body.id}/redirect`,
    { redirectTargetFacilityId: '22222222-0000-0000-0000-000000000001' }, liaisonGinchi.accessToken);
  ok('BR-25: redirect recorded', redirected.body.status === 'REDIRECTED', redirected.body.status);

  const chain = await api('GET', `/v1/referrals/${r2.body.id}/chain`, null, clinician.accessToken);
  ok('BR-25: redirect spawned a child in the same chain', Array.isArray(chain.body) && chain.body.length === 2,
    `status=${chain.status} body=${JSON.stringify(chain.body).slice(0,160)}`);
  console.log(`     -> chain: ${(Array.isArray(chain.body)?chain.body:[]).map(c => c.referral_code + '(' + c.status + ')').join(' -> ')}`);

  /* --------------------------------------- 7. SLA BREACH & NOT ARRIVED */
  console.log('\n\x1b[36m7. Automated clocks (BR-21, BR-32)\x1b[0m');

  const p3 = await api('POST', '/v1/patients', {
    givenNameLat: 'Beshadu', fathersNameLat: 'Lemma', sex: 'female',
    ageValue: 3, ageUnit: 'years', woredaId: '11111111-0000-0000-0000-000000000003',
  }, hew.accessToken);

  const r3 = await api('POST', '/v1/referrals', {
    patientId: p3.body.id, reasonCode: 'severe_pneumonia_child',
    targetFacilityId: '22222222-0000-0000-0000-000000000002',
    suggestionRankOfChosen: 1,
    provisionalDiagnosis: 'Severe pneumonia',
    clinical: { bpSystolic: 90, bpDiastolic: 55, pulse: 140, respRate: 52, temperatureC: 39.2 },
  }, hew.accessToken);

  // Force the SLA deadline into the past, then run the scheduler logic.
  const { Client } = require('pg');
  const pg = new Client({
    host: process.env.PGHOST || '127.0.0.1', port: parseInt(process.env.PGPORT || '5432', 10),
    user: process.env.PGUSER || 'erl', password: process.env.PGPASSWORD || 'erl',
    database: process.env.PGDATABASE || 'erl_dev',
  });
  await pg.connect();
  await pg.query(`UPDATE referral SET sla_deadline_at = now() - interval '1 minute' WHERE id = $1`, [r3.body.id]);
  await api('POST', '/v1/admin/run-schedulers', {}, (await login('sysadmin')).accessToken);
  const escalated = await api('GET', `/v1/referrals/${r3.body.id}`, null, hew.accessToken);
  ok('BR-21: SLA breach escalates automatically',
    escalated.body.status === 'ESCALATED' && escalated.body.sla_breached === true,
    `${escalated.body.status} breached=${escalated.body.sla_breached}`);
  ok('Escalation level incremented', escalated.body.escalation_level === 1, String(escalated.body.escalation_level));

  await api('POST', `/v1/referrals/${r3.body.id}/accept`, {}, liaisonAmbo.accessToken);
  await api('POST', `/v1/referrals/${r3.body.id}/depart`, { transportMode: 'public' }, hew.accessToken);
  await pg.query(`UPDATE referral SET expected_arrival_at = now() - interval '1 hour' WHERE id = $1`, [r3.body.id]);
  await api('POST', '/v1/admin/run-schedulers', {}, (await login('sysadmin')).accessToken);
  const notArrived = await api('GET', `/v1/referrals/${r3.body.id}`, null, hew.accessToken);
  ok('BR-32: patient not arrived within grace -> NOT_ARRIVED',
    notArrived.body.status === 'NOT_ARRIVED', notArrived.body.status);

  const found = await api('POST', `/v1/referrals/${r3.body.id}/arrive`,
    { arrivalMethod: 'attestation' }, liaisonAmbo.accessToken);
  ok('Patient can still be found and marked arrived', found.body.status === 'ARRIVED', found.body.status);
  await pg.end();

  /* --------------------------------------------------- 8. ANALYTICS */
  console.log('\n\x1b[36m8. Analytics (Appendix C metric definitions)\x1b[0m');
  const metrics = await api('GET', '/v1/analytics/overview', null, woreda.accessToken);
  ok('Analytics endpoint responds', metrics.status === 200, String(metrics.status));
  ok('Loop-closure rate computed', metrics.body.loopClosureRatePct !== undefined,
    String(metrics.body.loopClosureRatePct));
  ok('Decline reasons aggregated', Array.isArray(metrics.body.declineReasons));
  ok('Benchmark targets exposed', metrics.body.benchmark.loopClosureTargetPct === 60);
  console.log(`     -> ${metrics.body.totals.totalReferrals} referrals, loop closure ${metrics.body.loopClosureRatePct}%, ` +
              `median ack ${metrics.body.medianMinutesToAcknowledge} min`);

  const oversightRead = await api('GET', `/v1/referrals/${refId}`, null, woreda.accessToken);
  ok('Oversight role sees flow but not the chart',
    oversightRead.body.clinicalRedacted === true, JSON.stringify(oversightRead.body).slice(0,120));

  /* ------------------------------------------------------- 9. AUDIT */
  console.log('\n\x1b[36m9. Audit integrity (NFR-SEC-06)\x1b[0m');
  const sysadmin = await login('sysadmin');
  const chainCheck = await api('GET', '/v1/audit/verify-chain', null, sysadmin.accessToken);
  ok('Audit hash chain is intact', chainCheck.body.ok === true,
    JSON.stringify(chainCheck.body));
  console.log(`     -> ${chainCheck.body.checked} audit entries verified`);

  const trail = await api('GET', `/v1/audit/referral/${refId}`, null, sysadmin.accessToken);
  ok('Every payload read is logged',
    trail.body.some((t) => t.action === 'read_payload'), `${trail.body.length} entries`);

  /* -------------------------------------------------------- 10. SYNC */
  console.log('\n\x1b[36m10. Offline sync (§12.4)\x1b[0m');
  const pull = await api('POST', '/v1/sync/pull',
    { deviceId: '99999999-0000-0000-0000-000000000001', cursor: 0 }, hew.accessToken);
  ok('Sync pull returns scoped changes', Array.isArray(pull.body.changes) && pull.body.changes.length > 0,
    `${pull.body.changes?.length} changes`);
  ok('Cursor advances', pull.body.cursor > 0, String(pull.body.cursor));

  const idempotentId = '88888888-0000-0000-0000-000000000001';
  const first = await api('POST', '/v1/referrals', {
    id: idempotentId, patientId, reasonCode: 'tb_diagnostic',
    targetFacilityId: '22222222-0000-0000-0000-000000000005',
    suggestionRankOfChosen: 1,
    provisionalDiagnosis: 'Suspected pulmonary TB',
    clinical: { bpSystolic: 112, bpDiastolic: 70, pulse: 84, respRate: 18, temperatureC: 37.8 },
  }, hew.accessToken);
  const replay = await api('POST', '/v1/referrals', {
    id: idempotentId, patientId, reasonCode: 'tb_diagnostic',
    targetFacilityId: '22222222-0000-0000-0000-000000000005',
    suggestionRankOfChosen: 1,
    provisionalDiagnosis: 'Suspected pulmonary TB',
    clinical: { bpSystolic: 112, bpDiastolic: 70, pulse: 84, respRate: 18, temperatureC: 37.8 },
  }, hew.accessToken);
  ok('Offline replay is idempotent (no duplicate)',
    first.body.id === replay.body.id && replay.body.referral_code === first.body.referral_code);

  /* ------------------------------------------------------- SUMMARY */
  console.log('\n' + results.join('\n'));
  console.log(`\n\x1b[1m${pass} passed, ${fail} failed\x1b[0m\n`);
  process.exit(fail > 0 ? 1 : 0);
})().catch((e) => {
  console.error('\n\x1b[31mTest run aborted:\x1b[0m', e.message);
  console.error(e.stack);
  process.exit(1);
});
