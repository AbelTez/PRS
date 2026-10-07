// Mock delayed responses to reproduce account and form races deterministically.
const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const site=process.env.SITE_URL || 'http://127.0.0.1:5176';
if(!['localhost','127.0.0.1'].includes(new URL(site).hostname))throw new Error('Use local Vite');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',headless:true,args:['--no-sandbox']});
 try{
  const p=await browser.newPage();await p.goto(site+'/login');
  await p.evaluate(async()=>{window.ai=(await import('/src/ai/useAi.js')).useAiStore;window.auth=(await import('/src/lib.js')).useAuth;});
  let held,seen;let ready=new Promise(r=>seen=r);
  await p.route('**/v1/ai/status',async route=>{if(!held){held=route;seen();}else await route.fulfill({json:{enabled:false,features:{}}});});
  await p.evaluate(()=>{window.old=window.ai.getState().load({id:'old',role:'doctor'});});await ready;
  await p.evaluate(async()=>{window.ai.getState().reset();await window.ai.getState().load({id:'new',role:'it_admin'});});
  await held.fulfill({json:{enabled:true,features:{chat:true}}});
  assert.equal(await p.evaluate(async()=>{await window.old;return window.ai.getState().status.enabled;}),false);
  console.log('PASS delayed AI status cannot overwrite the next account');await p.unroute('**/v1/ai/status');
  async function login(name){await p.getByLabel('Username',{exact:true}).fill(name);await p.getByRole('button',{name:'Sign in',exact:true}).click();await p.waitForURL('**/home');}
  await login('dr.abdi');
  await p.getByRole('button',{name:'Open the AI assistant',exact:true}).first().click();
  held=null;ready=new Promise(r=>seen=r);
  await p.route('**/v1/ai/chat',route=>{held=route;seen();});
  await p.getByRole('textbox',{name:'Ask a question…',exact:true}).fill('Private synthetic conversation');await p.getByRole('button',{name:'Send',exact:true}).click();await ready;
  await p.getByRole('button',{name:'New chat',exact:true}).click();await held.fulfill({json:{reply:'OLD ANSWER'}});
  await p.waitForTimeout(150);assert.equal(await p.getByText('OLD ANSWER',{exact:true}).count(),0);
  console.log('PASS New chat discards an in-flight reply');
  await p.evaluate(()=>{window.ai.getState().addMessage({role:'user',text:'Account A history'});window.auth.getState().logout();});
  assert.deepEqual(await p.evaluate(()=>window.ai.getState().messages),[]);
  await p.waitForURL('**/login');await login('dr.samuel');
  await p.getByRole('button',{name:'Open the AI assistant',exact:true}).first().click();
  assert.equal(await p.getByText('Account A history',{exact:true}).count(),0);
  console.log('PASS logout clears chat and panel state before the next doctor signs in');
  await p.getByRole('button',{name:'Close the assistant',exact:true}).click();await p.goto(site+'/consultations/new');
  held=null;ready=new Promise(r=>seen=r);
  await p.route('**/v1/ai/draft',route=>{held=route;seen();});
  await p.getByLabel('Opening message',{exact:false}).fill('Original input');await p.getByRole('button',{name:'Draft the message',exact:true}).click();await ready;
  await p.getByLabel('Opening message',{exact:false}).fill('Newer clinician text');await held.fulfill({json:{title:'Old title',message:'Old AI draft'}});
  await p.waitForTimeout(150);assert.equal(await p.getByLabel('Opening message',{exact:false}).inputValue(),'Newer clinician text');
  console.log('PASS delayed AI draft cannot overwrite clinician edits');
  await p.unroute('**/v1/ai/draft');await p.route('**/v1/ai/draft',r=>r.fulfill({status:503,json:{message:'AI is busy — try again'}}));
  await p.getByRole('button',{name:'Draft the message',exact:true}).click();await p.getByText('AI is busy — try again',{exact:false}).waitFor();
  assert.equal(await p.getByLabel('Opening message',{exact:false}).inputValue(),'Newer clinician text');
  await p.getByLabel('Title',{exact:false}).fill('Manual request still editable');
  console.log('PASS provider failure preserves manual form input');
  await p.route('**/v1/ai/status',r=>r.fulfill({json:{enabled:false,features:{}}}));await p.reload();
  await p.getByLabel('Opening message',{exact:false}).waitFor();
  assert.equal(await p.getByRole('button',{name:'Draft the message',exact:true}).count(),0);
  assert.equal(await p.getByRole('button',{name:'Open the AI assistant',exact:true}).count(),0);
  console.log('PASS disabled AI hides controls while the form remains usable');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
