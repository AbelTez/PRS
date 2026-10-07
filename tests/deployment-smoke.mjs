import assert from 'node:assert/strict';

const origin = process.env.SITE_URL;
assert.ok(origin, 'Set SITE_URL to the deployment to check');

async function request(path, options) {
  return fetch(new URL(path, origin), { signal: AbortSignal.timeout(60000), ...options });
}

for (const path of ['/', '/login', '/track', '/referrals', '/dashboard', '/portal', '/it']) {
  const response = await request(path);
  assert.equal(response.status, 200, `${path} should serve the React app`);
  assert.match(response.headers.get('content-type'), /text\/html/);
  assert.match(await response.text(), /id="root"/);
  console.log(`PASS page ${path}`);
}

const healthResponse = await request('/api/health');
assert.equal(healthResponse.status, 200);
const health = await healthResponse.json();
assert.equal(health.ok, true);
assert.equal(health.databaseConfigured, true);
assert.ok(Object.values(health.secretsConfigured).every(Boolean));
console.log('PASS API configuration');

for (const prefix of ['/api/v1', '/v1']) {
  const rejected = await request(`${prefix}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: '__deployment_probe__', password: 'invalid' }),
  });
  assert.equal(rejected.status, 401, `${prefix} should reach authentication`);
  assert.match(rejected.headers.get('content-type'), /application\/json/);
  const protectedResponse = await request(`${prefix}/auth/me`);
  assert.equal(protectedResponse.status, 401);
  console.log(`PASS authentication routing ${prefix}`);
}

if (process.env.SMOKE_USERNAME && process.env.SMOKE_PASSWORD) {
  const login = await request('/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: process.env.SMOKE_USERNAME, password: process.env.SMOKE_PASSWORD }),
  });
  assert.ok(login.ok, `Login failed with HTTP ${login.status}`);
  const session = await login.json();
  assert.ok(session.accessToken);
  const headers = { Authorization: `Bearer ${session.accessToken}` };
  const me = await request('/api/v1/auth/me', { headers });
  assert.equal(me.status, 200);
  assert.equal((await me.json()).username, process.env.SMOKE_USERNAME);
  console.log('PASS real sign-in and authenticated session');
}
