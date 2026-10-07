// Delayed network response regression for the shared workspace store.
const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const site=process.env.SITE_URL || 'http://127.0.0.1:5174';
if(!['localhost','127.0.0.1'].includes(new URL(site).hostname))throw new Error('Use the local Vite test app');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROME_PATH || '/usr/bin/google-chrome',headless:true,args:['--no-sandbox']});
 try{
  const page=await browser.newPage();await page.goto(site+'/login');
  let held,resolveSeen;
  const seen=new Promise(resolve=>{resolveSeen=resolve;});
  await page.route('**/v1/referrals?**',async route=>{
   if(!held){held=route;resolveSeen();}
   else await route.fulfill({json:[{id:'current-user-case'}]});
  });
  await page.evaluate(async()=>{
   window.workspace=(await import('/src/workspace.js')).useWorkload;
   window.pendingOld=window.workspace.getState().refresh({id:'previous-user',role:'hew'});
  });
  await seen;
  await page.evaluate(async()=>{
   window.workspace.getState().reset();
   await window.workspace.getState().refresh({id:'current-user',role:'hew'});
  });
  await held.fulfill({json:[{id:'previous-user-case'}]});
  const after=await page.evaluate(async()=>{await window.pendingOld;return window.workspace.getState().referrals;});
  assert.deepEqual(after,[{id:'current-user-case'}]);
  console.log('PASS delayed previous-user response cannot overwrite the new session');
  await page.evaluate(()=>window.workspace.getState().reset());
  assert.equal(await page.evaluate(()=>window.workspace.getState().referrals),null);
  assert.equal(await page.evaluate(()=>window.workspace.getState()._inflight),null);
  console.log('PASS session reset clears cached data and pending request ownership');
  await page.unroute('**/v1/referrals?**');
  await page.route('**/v1/referrals?**',async route=>{
   const response=await route.fetch();const rows=await response.json();
   rows.unshift({id:'mobile-width-fixture',status:'SUBMITTED',urgency:'urgent',
    origin_facility_id:'22222222-0000-0000-0000-000000000002',target_facility_id:'22222222-0000-0000-0000-000000000001',
    patientName:'Long patient name '.repeat(10),target_facility_name:'Long facility name '.repeat(10),
    referral_code:'UI-MOBILE-FIXTURE',slaRemainingMinutes:-123456,created_at:new Date().toISOString()});
   await route.fulfill({json:rows});
  });
  await page.setViewportSize({width:360,height:900});
  await page.getByLabel('Username',{exact:true}).fill('dr.abdi');
  await page.getByRole('button',{name:'Sign in',exact:true}).click();await page.waitForURL('**/home');
  await page.locator('a[href="/referrals/mobile-width-fixture"]').waitFor();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  console.log('PASS mobile Home contains long names and large overdue SLA values');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
