/* eslint-disable no-console */
/**
 * AI assistant checks against a LOCAL API with seed data and AI_ENABLED=true.
 *   API_BASE=http://127.0.0.1:3107 node server/scripts/e2e-ai.js
 * Calls the real Gemini API (a few requests). Refuses non-local targets.
 */
const assert = require('node:assert/strict');

const API = process.env.API_BASE || 'http://127.0.0.1:3000';
if (!['localhost', '127.0.0.1'].includes(new URL(API).hostname)) throw new Error('Use a local API');
const PASSWORD = process.env.SEED_PASSWORD || 'Password123!';

async function call(method, path, token, body) {
  const r = await fetch(`${API}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: r.status, json: await r.json().catch(() => null) };
}
const login = async (u) => (await call('POST', '/v1/auth/login', null, { username: u, password: PASSWORD })).json.accessToken;
let n = 0;
const pass = (m) => console.log(`PASS ${++n} ${m}`);

(async () => {
  const doctor = await login('dr.selam');
  const liaison = await login('liaison.blacklion');
  const patient = await login('abeba.k');

  const st = await call('GET', '/v1/ai/status', doctor);
  assert.equal(st.json?.enabled, true, 'AI must be enabled for the live-provider test');
  pass('doctor sees the assistant enabled');

  assert.equal((await call('GET', '/v1/ai/status', patient)).json.enabled, false); pass('patients get no AI');
  assert.equal((await call('POST', '/v1/ai/chat', patient, { messages: [{ role: 'user', text: 'hi' }] })).status, 403); pass('patient chat is forbidden');
  assert.equal((await call('POST', '/v1/ai/case-assist', liaison, { presentingComplaint: 'x' })).status, 403); pass('reception cannot use the case assistant');

  const c = await call('POST', '/v1/ai/case-assist', doctor, {
    sex: 'female', ageValue: 28, ageUnit: 'years', isPregnant: true,
    presentingComplaint: 'Severe headache and blurred vision, call 0911223344',
    vitals: { bpSystolic: 172, bpDiastolic: 114, pulse: 102, gestationalAgeWeeks: 34 },
  });
  assert.equal(c.status, 201, JSON.stringify(c.json));
  assert.ok(c.json.diagnoses.length >= 1 && ['emergency', 'urgent', 'routine'].includes(c.json.urgency));
  assert.ok(!c.json.reason || typeof c.json.reason.code === 'string');
  pass(`case assist → ${c.json.diagnoses[0].name} / ${c.json.urgency}`);

  const routing = await call('POST', '/v1/routing/suggest', doctor, { reasonCode: 'renal_failure', wardType: 'general' });
  assert.equal(routing.status, 201);
  const f = await call('POST', '/v1/ai/match-facility', doctor, { reasonCode: 'renal_failure', candidates: [{ facilityId: 'invented', name: 'Forged hospital' }], overrideReasons: ['invented'] });
  assert.equal(f.status, 201, JSON.stringify(f.json));
  assert.ok(routing.json.candidates.some(x => x.facilityId === f.json.recommendedFacilityId));
  pass('facility pick uses server routing despite forged browser candidates');

  const m = await call('POST', '/v1/ai/match-colleague', doctor, { question: 'Child with suspected nephrotic syndrome' });
  assert.equal(m.status, 201); assert.ok(m.json.matches.length > 0 && m.json.matches.every((x) => x.id && x.facilityId)); pass(`colleague match → ${m.json.matches.map((x) => x.specialty).join(', ')}`);

  const d = await call('POST', '/v1/ai/draft', doctor, { kind: 'follow_up', context: { finalDiagnosis: 'Malaria, treated', notes: 'continue ACT 3 days' } });
  assert.equal(d.status, 201); assert.ok(d.json.message && d.json.amharic && !d.json.message.includes('\\n')); pass('follow-up draft in English + Amharic');

  const ch = await call('POST', '/v1/ai/chat', doctor, { page: 'Home', messages: [{ role: 'user', text: 'How do I send a referral?' }] });
  assert.equal(ch.status, 201); assert.ok(ch.json.reply.length > 20 && !ch.json.reply.includes('$')); pass('assistant chat answers in plain text');

  console.log(`\n${n} AI checks passed.`);
})().catch((e) => { console.error(e); process.exit(1); });
