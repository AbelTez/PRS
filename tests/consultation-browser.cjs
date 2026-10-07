// Run against the isolated local API and Vite app. PLAYWRIGHT_MODULE can point
// to an existing playwright-core installation; no production data is touched.
const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const SITE=process.env.SITE_URL || 'http://127.0.0.1:5178';
if(!['localhost','127.0.0.1'].includes(new URL(SITE).hostname))throw new Error('Use a local test app');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROME_PATH || '/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream']});
 try {
  const errors=[];
  async function doctor(username,width=1280){
   const context=await browser.newContext({permissions:['camera','microphone'],viewport:{width,height:900}});
   const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
   await page.goto(SITE+'/login');await page.getByLabel('Username',{exact:true}).fill(username);
   await page.getByRole('button',{name:'Sign in',exact:true}).click();await page.waitForURL('**/home');
   return {context,page};
  }
  const a=await doctor('dr.abdi'),b=await doctor('dr.samuel',390);
  await a.page.getByRole('link',{name:'Consultations',exact:true}).filter({visible:true}).click();
  await a.page.getByRole('link',{name:'New consultation',exact:true}).click();
  await a.page.getByLabel('Facility',{exact:true}).selectOption({label:'Zewditu Memorial Hospital'});
  await a.page.getByLabel('Specialty',{exact:true}).selectOption({label:'Internal Medicine'});
  await a.page.getByLabel('Doctor name',{exact:true}).fill('Samuel');
  await a.page.getByLabel('Consulting doctor',{exact:false}).selectOption({label:'Dr Samuel Worku · Internal Medicine'});
  await a.page.getByLabel('Title',{exact:false}).fill('Browser video consultation');
  await a.page.getByLabel('Opening message',{exact:false}).fill('Let us discuss our training session.');
  await a.page.getByRole('button',{name:'Send consultation request',exact:true}).click();
  await a.page.waitForURL(/\/consultations\/[a-f0-9-]{36}$/);const url=a.page.url();
  await b.page.goto(url);await b.page.getByRole('button',{name:'Accept consultation',exact:true}).click();
  await a.page.getByLabel('Your message',{exact:false}).fill('Can you hear me on the call?');
  await a.page.getByRole('button',{name:'Send message',exact:true}).click();
  await b.page.getByText('Can you hear me on the call?',{exact:true}).waitFor();
  console.log('PASS create, accept and exchange messages in two browsers');
  await a.page.getByRole('button',{name:'Start video call',exact:true}).click();
  await b.page.getByRole('button',{name:'Join video call',exact:true}).click({timeout:30000});
  await Promise.all([a.page.getByRole('status').filter({hasText:'Connected'}).waitFor({timeout:60000}),b.page.getByRole('status').filter({hasText:'Connected'}).waitFor({timeout:60000})]);
  for(const page of [a.page,b.page]) {
   const stats=await page.locator('video[aria-label="Other doctor"]').evaluate(async v=>({tracks:v.srcObject.getTracks().map(t=>t.kind),width:v.videoWidth,ready:v.readyState}));
   assert.ok(stats.tracks.includes('audio'));assert.ok(stats.tracks.includes('video'));assert.ok(stats.width>0);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  }
  console.log('PASS live video and audio received in both browsers; mobile has no overflow');
  await a.page.getByRole('button',{name:'Mute microphone',exact:true}).click();
  assert.equal(await a.page.locator('video[aria-label="Your camera preview"]').evaluate(v=>v.srcObject.getAudioTracks()[0].enabled),false);
  await a.page.getByRole('button',{name:'Turn camera off',exact:true}).click();
  assert.equal(await a.page.locator('video[aria-label="Your camera preview"]').evaluate(v=>v.srcObject.getVideoTracks()[0].enabled),false);
  console.log('PASS microphone mute and camera off');
  await a.page.getByRole('button',{name:'Leave call',exact:true}).click();
  await b.page.getByRole('button',{name:'Start video call',exact:true}).waitFor({timeout:15000});
  console.log('PASS hangup reaches both doctors');
  await b.page.reload();await b.page.getByText('Can you hear me on the call?',{exact:true}).waitFor();
  console.log('PASS messages persist after reload');
  await a.page.getByRole('button',{name:'Start audio call',exact:true}).click();
  await b.page.getByRole('button',{name:'Decline call',exact:true}).click({timeout:30000});
  await a.page.getByRole('button',{name:'Start video call',exact:true}).waitFor({timeout:15000});
  console.log('PASS incoming audio call can be declined');
  await a.page.addInitScript(()=>{navigator.mediaDevices.getUserMedia=()=>Promise.reject(new DOMException('denied','NotAllowedError'));});
  await a.page.reload();await a.page.getByRole('button',{name:'Start video call',exact:true}).click();
  await a.page.getByText('Allow microphone and camera access in your browser, then try again.',{exact:true}).waitFor();
  console.log('PASS permission denial has a recoverable error');
  await a.page.getByRole('button',{name:'Leave call',exact:true}).click();
  assert.deepEqual(errors,[]);
  await a.context.close();await b.context.close();
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
