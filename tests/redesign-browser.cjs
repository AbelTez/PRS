// Mutating regression: use only an isolated, seeded local API and Vite app.
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const site = process.env.SITE_URL || 'http://127.0.0.1:5174';
const apiBase = process.env.API_BASE || 'http://127.0.0.1:3115';
for (const url of [site, apiBase]) if (!['localhost','127.0.0.1'].includes(new URL(url).hostname)) throw new Error('Use an isolated local test environment');
let checks = 0;
const pass = name => { checks++; console.log('PASS '+name); };
async function api(path, token, body) {
  const res = await fetch(apiBase+'/v1'+path, { method: body ? 'POST':'GET', headers: { 'Content-Type':'application/json', ...(token ? {Authorization:'Bearer '+token}:{}) }, body: body ? JSON.stringify(body):undefined });
  const data = await res.json(); assert.ok(res.ok, `${path}: ${res.status} ${JSON.stringify(data)}`); return data;
}
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome', headless:true, args:['--no-sandbox'] });
  const errors = [];
  try {
    async function login(username, width=1280) {
      const context = await browser.newContext({ viewport:{width,height:900} });
      const page = await context.newPage(); page.on('pageerror',e=>errors.push(e.message));
      await page.goto(site+'/login'); await page.getByLabel('Username',{exact:true}).fill(username);
      await page.getByRole('button',{name:'Sign in',exact:true}).click();
      await page.waitForURL(/\/(home|dashboard|portal)$/);
      const token = await page.evaluate(()=>localStorage.getItem('erl_token'));
      return {page,context,token};
    }
    const sender = await login('dr.samuel'), reception = await login('liaison.blacklion'), doctor = await login('dr.tigist');
    const p = sender.page;
    await p.goto(site+'/new');
    await p.getByLabel('Given name (Latin)',{exact:false}).fill('UIRegression');
    await p.getByLabel("Father's name",{exact:true}).fill('Fixture');
    await p.getByLabel('Sex',{exact:false}).selectOption('male');
    await p.getByRole('spinbutton',{name:/^Age/}).fill('58');
    await p.getByRole('button',{name:'Register and continue',exact:true}).click();
    await p.getByLabel('Reason',{exact:false}).selectOption('renal_failure');
    await p.getByLabel('Provisional diagnosis',{exact:false}).fill('UI regression test case');
    for (const [label,value] of [['BP systolic','120'],['BP diastolic','80'],['Pulse','80'],['Resp. rate','18'],['Temp °C','37'],['SpO₂ %','98']]) await p.getByLabel(label,{exact:false}).fill(value);
    await p.getByRole('button',{name:'Find a facility',exact:true}).click();
    await p.getByRole('button').filter({hasText:'Black Lion Specialised Hospital'}).filter({hasNotText:'Send referral'}).click();
    const override = p.locator('select').filter({has:p.locator('option[value="known_specialist"]')});
    if (await override.count()) await override.selectOption('known_specialist');
    await p.getByRole('button',{name:'Send referral to Black Lion Specialised Hospital',exact:true}).click();
    await p.waitForURL(/\/referrals\/[a-f0-9-]{36}$/);
    const id = new URL(p.url()).pathname.split('/').pop(), path='/referrals/'+id;
    let r = await api(path,sender.token);
    assert.equal(r.status,'SUBMITTED'); pass('patient registration and referral wizard submit through the new shell');

    await p.goto(site+'/referrals?view=all');
    await p.getByRole('searchbox',{name:'Search by patient, code, diagnosis or facility'}).fill(r.referral_code);
    await p.waitForURL(url=>url.searchParams.get('q')===r.referral_code);
    await p.reload();
    assert.equal(await p.getByRole('searchbox',{name:'Search by patient, code, diagnosis or facility'}).inputValue(),r.referral_code);
    await p.locator(`a[href="${path}"]`).filter({visible:true}).first().click();
    pass('queue search persists in URL across refresh and opens the selected case');

    await doctor.page.goto(site+path);
    await doctor.page.getByText('Not assigned to you',{exact:false}).waitFor();
    assert.equal(await doctor.page.getByRole('button',{name:'Accept referral',exact:true}).count(),0);
    pass('unassigned doctor cannot read or act on the case');
    await reception.page.goto(site+path);
    await reception.page.getByRole('button',{name:'Assign clinician',exact:true}).filter({visible:true}).first().click();
    let dialog = reception.page.getByRole('dialog');
    await dialog.getByRole('radio').filter({hasText:'Dr Tigist Alemu'}).click();
    await dialog.getByRole('button',{name:'Assign and notify',exact:true}).click();
    await dialog.waitFor({state:'hidden'});
    r=await api(path,sender.token); assert.ok(r.assignment); pass('reception assigns the clinician using the new drawer');

    await doctor.page.reload();
    await doctor.page.getByRole('button',{name:'Accept referral',exact:true}).filter({visible:true}).first().click();
    dialog=doctor.page.getByRole('dialog');
    await dialog.getByLabel('Receiving clinician',{exact:true}).fill('Dr Tigist Alemu');
    const focusable = dialog.locator('button,input,select,textarea').filter({visible:true});
    await focusable.last().focus(); await doctor.page.keyboard.press('Tab');
    assert.equal(await dialog.evaluate(el=>el.contains(document.activeElement)),true);
    await focusable.first().focus(); await doctor.page.keyboard.press('Shift+Tab');
    assert.equal(await dialog.evaluate(el=>el.contains(document.activeElement)),true);
    await dialog.getByRole('button',{name:'Accept referral',exact:true}).click();
    await dialog.waitFor({state:'hidden'});
    assert.equal((await api(path,sender.token)).status,'ACCEPTED'); pass('acceptance and keyboard focus confinement work');

    await p.reload(); await p.getByRole('button',{name:'Mark departed',exact:true}).filter({visible:true}).first().click();
    await p.getByRole('dialog').getByRole('button',{name:'Confirm departure',exact:true}).click();
    await p.getByRole('dialog').waitFor({state:'hidden'});
    r=await api(path,sender.token); assert.equal(r.status,'IN_TRANSIT'); assert.equal(r.transport_mode,'ambulance');
    pass('departure saves the transport option displayed in the dialog');
    await doctor.page.setViewportSize({width:390,height:844}); await doctor.page.reload();
    await doctor.page.getByRole('button',{name:'Confirm arrival',exact:true}).filter({visible:true}).first().click();
    await doctor.page.getByRole('button',{name:'Start care',exact:true}).filter({visible:true}).first().click();
    await doctor.page.getByRole('button',{name:'Submit outcome',exact:true}).filter({visible:true}).first().click();
    dialog=doctor.page.getByRole('dialog');
    await dialog.getByLabel('Final diagnosis',{exact:false}).fill('UI test outcome');
    await dialog.getByLabel('Disposition',{exact:false}).selectOption('discharged_home');
    await dialog.getByLabel('Treatment provided',{exact:false}).fill('Synthetic test treatment');
    await dialog.getByRole('button',{name:/Return outcome to/}).click();
    await dialog.waitFor({state:'hidden'});
    assert.equal((await api(path,sender.token)).status,'OUTCOME_RETURNED');
    assert.equal(await doctor.page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    pass('mobile arrival, start-care and outcome actions preserve the lifecycle');
    await p.reload();
    await Promise.all([p.waitForResponse(res=>res.url().endsWith(path+'/acknowledge-outcome') && res.ok()),p.getByRole('button',{name:'Acknowledge outcome',exact:true}).filter({visible:true}).first().click()]);
    await p.getByText('UI test outcome',{exact:true}).waitFor();
    assert.equal((await api(path,sender.token)).status,'CLOSED_COMPLETED'); pass('origin acknowledges outcome and closes the loop');
    await p.getByRole('tab',{name:/Activity/}).click();
    await p.getByRole('tabpanel').getByText(/Acknowledge outcome/i).first().waitFor(); pass('activity tab preserves transition history');

    // A second synthetic case exercises destructive confirmation and decline.
    const suggestions=await api('/routing/suggest',sender.token,{reasonCode:'renal_failure'});
    const index=suggestions.candidates.findIndex(x=>x.name.includes('Black Lion'));
    async function createCase() { return api('/referrals',sender.token,{patientId:r.patient_id,reasonCode:'renal_failure',targetFacilityId:suggestions.candidates[index].facilityId,suggestionRankOfChosen:index+1,overrideReason:index?'known_specialist':undefined,provisionalDiagnosis:'UI secondary test',clinical:{bpSystolic:120,bpDiastolic:80,pulse:80,respRate:18,temperatureC:37}}); }
    const cancelled=await createCase(); await p.goto(site+'/referrals/'+cancelled.id);
    await p.getByRole('button',{name:'Cancel referral',exact:true}).filter({visible:true}).first().click();
    await p.getByRole('dialog').getByRole('button',{name:'Keep referral',exact:true}).click();
    assert.equal((await api('/referrals/'+cancelled.id,sender.token)).status,'SUBMITTED');
    await p.getByRole('button',{name:'Cancel referral',exact:true}).filter({visible:true}).first().click();
    await p.getByRole('dialog').getByRole('button',{name:'Cancel referral',exact:true}).click();
    await p.getByRole('dialog').waitFor({state:'hidden'});
    assert.equal((await api('/referrals/'+cancelled.id,sender.token)).status,'CLOSED_CANCELLED'); pass('cancel requires confirmation and keeping a referral preserves it');
    const declined=await createCase(); await reception.page.goto(site+'/referrals/'+declined.id);
    await reception.page.getByRole('button',{name:'Decline',exact:true}).filter({visible:true}).first().click();
    dialog=reception.page.getByRole('dialog');
    assert.equal(await dialog.getByRole('button',{name:'Decline',exact:true}).isDisabled(),true);
    await dialog.getByLabel('Reason',{exact:false}).selectOption('no_specialist');
    await dialog.getByRole('button',{name:'Decline',exact:true}).click(); await dialog.waitFor({state:'hidden'});
    assert.equal((await api('/referrals/'+declined.id,sender.token)).status,'DECLINED'); pass('decline requires and saves a coded reason');
    assert.deepEqual(errors,[]);
    console.log(`${checks} redesigned workflow checks passed`);
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});
