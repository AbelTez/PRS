#!/usr/bin/env node
/**
 * End-to-end tests for the pilot feature build:
 * verified accounts & IT administration, attachments, real ward reservations,
 * patient portal + public tracker, feedback with IT-only visibility, and
 * role-scoped analytics.
 *
 * Run after seeding, with the API listening:  node scripts/e2e-features.js
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
  if (r.status >= 400) throw new Error(`Login failed for ${username}: ${r.status} ${JSON.stringify(r.body)}`);
  return r.body;
}

// 1x1 PNG
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

(async () => {
  console.log('\n\x1b[1mEthio Referral Linkage — pilot feature build e2e\x1b[0m');
  console.log(`Target: ${BASE}\n`);

  /* ------------------------------------------ 1. VERIFIED ACCOUNTS & IT */
  console.log('\x1b[36m1. Account verification & IT administration\x1b[0m');

  const pending = await api('POST', '/v1/auth/login', { username: 'dr.yonas', password: PASSWORD });
  ok('Pending doctor cannot sign in', pending.status === 403, String(pending.status));
  ok('...with a message naming IT verification',
    JSON.stringify(pending.body).toLowerCase().includes('verification'), JSON.stringify(pending.body).slice(0, 120));

  const itBL = await login('it.blacklion');
  const itAmbo = await login('it.ambo');
  const staffBL = await api('GET', '/v1/users', null, itBL.accessToken);
  ok('IT admin lists staff', Array.isArray(staffBL.body) && staffBL.body.length > 0);
  ok('IT admin sees ONLY their own facility staff',
    staffBL.body.every((u) => u.facilityId === itBL.user.facilityId),
    JSON.stringify([...new Set(staffBL.body.map((u) => u.facilityName))]));

  const doctor0 = await login('dr.kebede').catch(() => null); // may not exist — fall back
  const doctorLogin = doctor0 || await login('clin.ambohc');
  const doctorSeesUsers = await api('GET', '/v1/users', null, doctorLogin.accessToken);
  ok('Clinical roles cannot access staff administration', doctorSeesUsers.status === 403, String(doctorSeesUsers.status));

  const noLicense = await api('POST', '/v1/users',
    { username: 'dr.nolicense', fullName: 'Dr No License', role: 'doctor' }, itBL.accessToken);
  ok('Registering a doctor without an MoH license is rejected', noLicense.status === 400);

  const dup = await api('POST', '/v1/users',
    { username: 'dr.tigist', fullName: 'Duplicate', role: 'liaison' }, itBL.accessToken);
  ok('Duplicate username is rejected', dup.status === 409, String(dup.status));

  const yonasRow = staffBL.body.find((u) => u.username === 'dr.yonas');
  ok('Pending doctor appears in the verification queue', !!yonasRow && yonasRow.status === 'pending');

  const wrongIT = await api('POST', `/v1/users/${yonasRow.id}/verify`, {}, itAmbo.accessToken);
  ok("Another hospital's IT cannot verify him", wrongIT.status === 403, String(wrongIT.status));

  const verified = await api('POST', `/v1/users/${yonasRow.id}/verify`, {}, itBL.accessToken);
  ok('Own facility IT verifies the doctor', verified.body.status === 'active', JSON.stringify(verified.body).slice(0, 120));
  const yonas = await login('dr.yonas');
  ok('Verified doctor can now sign in', !!yonas.accessToken);

  /* ------------------------- 2. DOCTOR REFERRAL + ATTACHMENT + IDENTITY */
  console.log('\n\x1b[36m2. Doctor referral, attachments, sender identity\x1b[0m');

  const drSamuel = await login('dr.samuel');           // Zewditu internist
  const liaisonBL = await login('liaison.blacklion');

  const p = await api('POST', '/v1/patients', {
    givenNameLat: 'Feature', fathersNameLat: 'Test', sex: 'male',
    ageValue: 58, ageUnit: 'years', phonePrimary: '+251920333444',
  }, drSamuel.accessToken);

  const suggest = await api('POST', '/v1/routing/suggest', { reasonCode: 'renal_failure' }, drSamuel.accessToken);
  const target = suggest.body.candidates.find((c) => c.name.includes('Black Lion')) || suggest.body.candidates[0];
  ok('Routing offers a dialysis-capable apex facility', !!target, JSON.stringify(suggest.body.candidates.map((c) => c.name)));

  const created = await api('POST', '/v1/referrals', {
    patientId: p.body.id, reasonCode: 'renal_failure',
    targetFacilityId: target.facilityId,
    suggestionRankOfChosen: (suggest.body.candidates.findIndex((c) => c.facilityId === target.facilityId) + 1) || 1,
    overrideReason: suggest.body.candidates[0]?.facilityId === target.facilityId ? undefined : 'known_specialist',
    provisionalDiagnosis: 'CKD stage 5, needs urgent dialysis',
    clinical: { bpSystolic: 176, bpDiastolic: 102, pulse: 92, respRate: 20, temperatureC: 36.7 },
    attachments: [{ name: 'chest-xray.png', dataUrl: PNG, kind: 'imaging' }],
  }, drSamuel.accessToken);
  ok('Doctor role can create a referral', created.status < 300, JSON.stringify(created.body).slice(0, 200));
  const refId = created.body.id;
  ok('Attachment stored with the referral',
    Array.isArray(created.body.attachments) && created.body.attachments.length === 1,
    JSON.stringify(created.body.attachments));

  const inbound = await api('GET', `/v1/referrals/${refId}`, null, liaisonBL.accessToken);
  ok('Receiver sees the referring doctor identity (license + title)',
    inbound.body.referringUser?.licenseNumber === 'MOH-MD-12055'
      && !!inbound.body.referringUser?.title,
    JSON.stringify(inbound.body.referringUser));
  ok('Receiver sees the full sending-facility address',
    !!inbound.body.originFacility?.address && !!inbound.body.originFacility?.phone,
    JSON.stringify(inbound.body.originFacility));

  const att = inbound.body.attachments?.[0];
  const attContent = await api('GET', `/v1/referrals/${refId}/attachments/${att?.id}`, null, liaisonBL.accessToken);
  ok('Receiver can download the attachment content',
    (attContent.body?.dataUrl || '').startsWith('data:image/png'), String(attContent.status));

  const outsider = await login('liaison.guder');
  const attDenied = await api('GET', `/v1/referrals/${refId}/attachments/${att?.id}`, null, outsider.accessToken);
  ok('Non-party facility cannot access attachments (BR-51)', attDenied.status === 403, String(attDenied.status));

  /* ------------------------- 2b. RECEPTION → CLINICIAN ASSIGNMENT */
  console.log('\n\x1b[36m2b. Reception first, then assignment\x1b[0m');

  // dr.tigist works at Black Lion (the receiving facility) but has not been
  // given this case, so the chart must stay closed to her.
  const drTigist = await login('dr.tigist');
  const beforeAssign = await api('GET', `/v1/referrals/${refId}`, null, drTigist.accessToken);
  ok('Unassigned clinician at the receiving facility cannot open the referral',
    beforeAssign.status === 403, String(beforeAssign.status));
  ok('...and is told it is awaiting assignment',
    JSON.stringify(beforeAssign.body).includes('assigned'), JSON.stringify(beforeAssign.body).slice(0, 140));

  const unassignedList = await api('GET', '/v1/referrals?direction=inbound', null, drTigist.accessToken);
  ok('Unassigned clinician does not see it in their inbound list',
    Array.isArray(unassignedList.body) && !unassignedList.body.some((x) => x.id === refId),
    `${unassignedList.body?.length} rows`);

  const attBlocked = await api('GET', `/v1/referrals/${refId}/attachments/${att?.id}`, null, drTigist.accessToken);
  ok('Unassigned clinician cannot fetch the imaging either', attBlocked.status === 403, String(attBlocked.status));

  const actBlocked = await api('POST', `/v1/referrals/${refId}/acknowledge`, {}, drTigist.accessToken);
  ok('Unassigned clinician cannot act on the case', actBlocked.status === 403, String(actBlocked.status));

  const receptionView = await api('GET', `/v1/referrals/${refId}`, null, liaisonBL.accessToken);
  ok('Reception sees the case and may assign it',
    receptionView.body.canAssign === true && receptionView.body.awaitingAssignment === true,
    JSON.stringify({ canAssign: receptionView.body.canAssign, awaiting: receptionView.body.awaitingAssignment }));

  const clinicians = await api('GET', `/v1/referrals/${refId}/assignable-clinicians`, null, liaisonBL.accessToken);
  ok('Reception can list the facility clinicians', Array.isArray(clinicians.body) && clinicians.body.length > 0,
    JSON.stringify(clinicians.body?.map?.((c) => c.fullName)));
  ok('...with their current caseload', clinicians.body.every((c) => typeof c.activeCases === 'number'));
  ok('...and only clinicians of THAT facility',
    clinicians.body.every((c) => ['doctor', 'clinician', 'specialist'].includes(c.role)));

  const drTigistRow = clinicians.body.find((c) => c.fullName.includes('Tigist'));
  const cliniciansAsDoctor = await api('GET', `/v1/referrals/${refId}/assignable-clinicians`, null, drTigist.accessToken);
  ok('A clinician cannot list/assign (reception responsibility)', cliniciansAsDoctor.status === 403,
    String(cliniciansAsDoctor.status));

  const selfAssign = await api('POST', `/v1/referrals/${refId}/assign`,
    { doctorId: drTigistRow.id }, drTigist.accessToken);
  ok('A clinician cannot assign the case to themselves', selfAssign.status === 403, String(selfAssign.status));

  const badAssign = await api('POST', `/v1/referrals/${refId}/assign`,
    { doctorId: itBL.user.id }, liaisonBL.accessToken);
  ok('Cannot assign a referral to a non-clinical account', badAssign.status === 400, String(badAssign.status));

  const otherFacilityDoc = await api('POST', `/v1/referrals/${refId}/assign`,
    { doctorId: drSamuel.user.id }, liaisonBL.accessToken);
  ok("Cannot assign to another hospital's clinician", otherFacilityDoc.status === 400,
    String(otherFacilityDoc.status));

  const assigned = await api('POST', `/v1/referrals/${refId}/assign`,
    { doctorId: drTigistRow.id, note: 'On call for nephrology tonight' }, liaisonBL.accessToken);
  ok('Reception assigns the case to a named clinician',
    assigned.body.assignment?.doctorId === drTigistRow.id, JSON.stringify(assigned.body.assignment));
  ok('Assignment records who assigned it', !!assigned.body.assignment?.assignedByName);

  const afterAssign = await api('GET', `/v1/referrals/${refId}`, null, drTigist.accessToken);
  ok('The assigned clinician can now open the chart', afterAssign.status === 200, String(afterAssign.status));
  ok('...and sees it flagged as theirs', afterAssign.body.assignment?.isMine === true);
  ok('...and can now fetch the imaging',
    (await api('GET', `/v1/referrals/${refId}/attachments/${att?.id}`, null, drTigist.accessToken)).status === 200);

  const assignedList = await api('GET', '/v1/referrals?direction=inbound', null, drTigist.accessToken);
  ok('It now appears in the clinician inbound list',
    assignedList.body.some((x) => x.id === refId && x.assignedToMe === true));

  const drMulu = await login('dr.mulu'); // St Paul's — different hospital
  ok("Another hospital's clinician still cannot open it",
    (await api('GET', `/v1/referrals/${refId}`, null, drMulu.accessToken)).status === 403);

  const trail = await api('GET', `/v1/referrals/${refId}`, null, liaisonBL.accessToken);
  ok('Assignment is written to the referral audit trail',
    trail.body.transitions.some((t) => t.event === 'assign'),
    JSON.stringify(trail.body.transitions.map((t) => t.event)));

  const recStats = await api('GET', '/v1/analytics/overview', null, liaisonBL.accessToken);
  ok('Reception dashboard exposes the awaiting-assignment queue',
    typeof recStats.body.queue?.awaitingAssignment === 'number',
    JSON.stringify(recStats.body.queue));

  const docStats = await api('GET', '/v1/analytics/overview', null, drTigist.accessToken);
  ok('Clinician dashboard exposes their assigned caseload',
    docStats.body.assignedToMe?.total >= 1, JSON.stringify(docStats.body.assignedToMe));

  /* --------------------------------------- 3. REAL WARD RESERVATIONS */
  console.log('\n\x1b[36m3. Real bed reservations\x1b[0m');

  const facBefore = await api('GET', `/v1/facilities/${target.facilityId}`, null, liaisonBL.accessToken);
  const genBefore = facBefore.body.capacity.find((c) => c.ward_type === 'general')?.beds_free;

  const accepted = await api('POST', `/v1/referrals/${refId}/accept`,
    { bedReserved: true, wardType: 'general', receivingClinicianName: 'Nephrology duty team' },
    liaisonBL.accessToken);
  ok('Accept with reservation succeeds', accepted.body.status === 'ACCEPTED', JSON.stringify(accepted.body).slice(0, 160));
  ok('Reserved ward recorded on the referral', accepted.body.reserved_ward_type === 'general');

  const facAfter = await api('GET', `/v1/facilities/${target.facilityId}`, null, liaisonBL.accessToken);
  const genAfter = facAfter.body.capacity.find((c) => c.ward_type === 'general')?.beds_free;
  ok('Reservation decrements a REAL bed on the board',
    genAfter === genBefore - 1, `${genBefore} -> ${genAfter}`);

  const cancelled = await api('POST', `/v1/referrals/${refId}/cancel`, {}, drSamuel.accessToken);
  ok('Origin can cancel the accepted referral', String(cancelled.body.status).startsWith('CLOSED'), cancelled.body.status);
  const facReleased = await api('GET', `/v1/facilities/${target.facilityId}`, null, liaisonBL.accessToken);
  const genReleased = facReleased.body.capacity.find((c) => c.ward_type === 'general')?.beds_free;
  ok('Cancelling releases the reserved bed', genReleased === genBefore, `${genBefore} -> ${genAfter} -> ${genReleased}`);

  /* ----------------------------------------- 4. PATIENT PORTAL & TRACKER */
  console.log('\n\x1b[36m4. Patient portal & public tracker\x1b[0m');

  const abeba = await login('abeba.k');
  ok('Patient account signs in', abeba.user.role === 'patient');
  const portal = await api('GET', '/v1/portal/me', null, abeba.accessToken);
  ok('Portal lists the patient referrals', portal.body.referrals?.length >= 1,
    JSON.stringify(portal.body).slice(0, 160));
  const myRef = portal.body.referrals[0];
  ok('Patient view is clinically redacted', myRef.clinicalRedacted === true && myRef.clinical === undefined);
  ok('Patient sees both facilities contact details',
    !!myRef.originFacility?.name && !!myRef.targetFacility?.phone);
  ok('Patient sees follow-up instructions', !!myRef.outcome?.followUpInstructions, JSON.stringify(myRef.outcome));

  const staffPortal = await api('GET', '/v1/portal/me', null, drSamuel.accessToken);
  ok('Staff cannot use the patient portal', staffPortal.status === 403, String(staffPortal.status));

  const lookup = await api('POST', '/v1/portal/lookup', { code: 'ERL-K7PM-42', phone: '0912000001' });
  ok('Public tracker works with code + phone', lookup.body.referral_code === 'ERL-K7PM-42',
    JSON.stringify(lookup.body).slice(0, 120));
  const wrongPhone = await api('POST', '/v1/portal/lookup', { code: 'ERL-K7PM-42', phone: '0999999999' });
  ok('Wrong phone is rejected', wrongPhone.status === 403, String(wrongPhone.status));

  /* -------------------------------------- 5. FEEDBACK & ITS VISIBILITY */
  console.log('\n\x1b[36m5. Feedback — IT-only, own-facility-only\x1b[0m');

  const rate = await api('POST', '/v1/feedback', {
    referralId: myRef.id,
    ratings: [
      { facilityRole: 'origin', rating: 5, comment: 'The health worker arranged everything fast.' },
      { facilityRole: 'target', rating: 4 },
    ],
  }, abeba.accessToken);
  ok('Patient can rate both facilities', rate.body.ok === true && rate.body.feedback?.length === 2,
    JSON.stringify(rate.body).slice(0, 160));

  const staffRate = await api('POST', '/v1/feedback',
    { referralId: myRef.id, ratings: [{ facilityRole: 'target', rating: 1 }] }, drSamuel.accessToken);
  ok('Staff cannot submit feedback', staffRate.status === 403, String(staffRate.status));

  const docFb = await api('GET', '/v1/feedback/my-facility', null, drSamuel.accessToken);
  ok('Doctors cannot read feedback', docFb.status === 403, String(docFb.status));
  const liaisonFb = await api('GET', '/v1/feedback/my-facility', null, liaisonBL.accessToken);
  ok('Liaisons cannot read feedback', liaisonFb.status === 403, String(liaisonFb.status));

  const amboFb = await api('GET', '/v1/feedback/my-facility', null, itAmbo.accessToken);
  ok('IT admin reads feedback for their OWN facility', amboFb.status === 200 && amboFb.body.count >= 2,
    JSON.stringify(amboFb.body).slice(0, 120));
  ok('Feedback is linked to the ordering doctor and the from/to hospitals',
    amboFb.body.items.every((i) => i.referringDoctor && i.fromFacility && i.toFacility),
    JSON.stringify(amboFb.body.items[0] || {}));

  const blFb = await api('GET', '/v1/feedback/my-facility', null, itBL.accessToken);
  const blOnlyOwn = blFb.body.items.every((i) =>
    i.facilityRole === 'target' ? i.toFacility.includes('Black Lion') : i.fromFacility.includes('Black Lion'));
  ok("IT admin never sees another hospital's feedback", blOnlyOwn,
    JSON.stringify(blFb.body.items.map((i) => `${i.fromFacility}->${i.toFacility} (${i.facilityRole})`)));

  const doctorDetail = await api('GET', `/v1/referrals/${myRef.id}`, null, (await login('hew.awaro')).accessToken);
  ok('Clinical staff referral view carries NO feedback', doctorDetail.body.feedback === undefined,
    Object.keys(doctorDetail.body).filter((k) => k.includes('feed')).join(','));

  /* ----------------------------------------- 6. ROLE-SCOPED ANALYTICS */
  console.log('\n\x1b[36m6. Role-scoped analytics\x1b[0m');

  const docAn = await api('GET', '/v1/analytics/overview', null, drSamuel.accessToken);
  ok('Doctor gets only their own referral stats', docAn.body.scope === 'my_referrals', docAn.body.scope);
  ok('Doctor analytics carries no feedback and no facility ratings',
    !JSON.stringify(docAn.body).includes('feedback') && !JSON.stringify(docAn.body).includes('rating'));

  const liaisonAn = await api('GET', '/v1/analytics/overview', null, liaisonBL.accessToken);
  ok('Liaison gets facility operations only', liaisonAn.body.scope === 'facility_operations', liaisonAn.body.scope);
  ok('Liaison analytics has no decline/override detail',
    liaisonAn.body.declineReasons === undefined && liaisonAn.body.overrideInsights === undefined);

  const itAn = await api('GET', '/v1/analytics/overview', null, itAmbo.accessToken);
  ok('IT admin gets detailed facility analytics', itAn.body.scope === 'it_facility_detail', itAn.body.scope);
  ok('IT detail includes override insights (BR-13 data utilised)',
    Array.isArray(itAn.body.overrideInsights?.reasons), JSON.stringify(itAn.body.overrideInsights).slice(0, 120));

  const woreda = await login('woreda.ws');
  const wAn = await api('GET', '/v1/analytics/overview', null, woreda.accessToken);
  ok('Oversight keeps network flow metrics', wAn.body.scope === 'network_flow' && wAn.body.benchmark?.loopClosureTargetPct === 60);
  ok('Oversight analytics carries no patient feedback', !JSON.stringify(wAn.body).includes('"comment"'));

  const otherFac = await api('GET', `/v1/analytics/facility/${itBL.user.facilityId}`, null, itAmbo.accessToken);
  ok("IT admin cannot open another facility's analytics", otherFac.status === 403, String(otherFac.status));

  /* ------------------------------------------------------- SUMMARY */
  console.log('\n' + results.join('\n'));
  console.log(`\n\x1b[1m${pass} passed, ${fail} failed\x1b[0m\n`);
  process.exit(fail > 0 ? 1 : 0);
})().catch((e) => {
  console.error('\n\x1b[31mTest run aborted:\x1b[0m', e.message);
  console.error(e.stack);
  process.exit(1);
});
