// Real Gemini browser walkthrough, using only synthetic cases and a local API.
const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const site=process.env.SITE_URL || 'http://127.0.0.1:5176';
if(!['localhost','127.0.0.1'].includes(new URL(site).hostname))throw new Error('Use a local test app');
let checks=0;const pass=s=>console.log(`PASS ${++checks} ${s}`);
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROME_PATH || '/usr/bin/google-chrome',headless:true,args:['--no-sandbox']});
 const errors=[];
 try{
  async function login(username){const p=await browser.newPage({viewport:{width:1440,height:1000}});p.on('pageerror',e=>errors.push(e.message));await p.goto(site+'/login');await p.getByLabel('Username',{exact:true}).fill(username);await p.getByRole('button',{name:'Sign in',exact:true}).click();await p.waitForURL('**/home');return p;}
  async function ai(p,path,click){
   for(let attempt=1;attempt<=3;attempt++){
    const response=p.waitForResponse(r=>r.url().endsWith('/v1/ai/'+path)&&r.request().method()==='POST',{timeout:35000});const [r]=await Promise.all([response,click()]);const body=await r.json();
    if([429,503].includes(r.status())&&attempt<3){console.log(`RETRY ${path}: provider busy (${r.status()}), attempt ${attempt}`);await p.waitForTimeout(20000);continue;}
    assert.equal(r.status(),201,JSON.stringify(body));return body;
   }
  }
  const p=await login('dr.selam');
  await p.getByRole('button',{name:'Open the AI assistant',exact:true}).first().click();
  await p.getByRole('textbox',{name:'Ask a question…',exact:true}).fill('How do I start a referral on this platform?');
  const chat=await ai(p,'chat',async()=>{await p.getByRole('textbox',{name:'Ask a question…',exact:true}).fill('How do I start a referral on this platform?');await p.getByRole('button',{name:'Send',exact:true}).click();});assert.ok(chat.reply.length>20);
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  pass('desktop docked assistant answers using the real provider');
  await p.getByRole('button',{name:'Close the assistant',exact:true}).click();
  await p.goto(site+'/new');
  await p.getByLabel('Given name (Latin)',{exact:false}).fill('SyntheticAi');await p.getByLabel("Father's name",{exact:true}).fill('Review');
  await p.getByRole('spinbutton',{name:/^Age/}).fill('28');await p.getByRole('button',{name:'Register and continue',exact:true}).click();
  await p.getByLabel('Presenting complaint',{exact:false}).fill('Synthetic case: headache, blurred vision, pregnant at 34 weeks.');
  for(const [label,value] of [['BP systolic','172'],['BP diastolic','114'],['Pulse','102'],['Resp. rate','20'],['Temp °C','37'],['SpO₂ %','98']])await p.getByLabel(label,{exact:false}).fill(value);
  const c=await ai(p,'case-assist',()=>p.getByRole('button',{name:'Get AI suggestions',exact:true}).click());
  assert.equal(c.urgency,'emergency');assert.ok(c.diagnoses.length);assert.ok(c.reason?.code);
  const diagnosis=p.getByLabel('Provisional diagnosis',{exact:false});assert.equal(await diagnosis.inputValue(),'');
  await p.getByRole('button',{name:'Use as diagnosis',exact:true}).first().click();assert.equal(await diagnosis.inputValue(),c.diagnoses[0].name);
  pass('case assistant returns emergency advice; diagnosis changes only after Apply');
  await p.getByLabel('Reason',{exact:false}).selectOption('renal_failure');
  await p.getByRole('button',{name:'Find a facility',exact:true}).click();
  const f=await ai(p,'match-facility',()=>p.getByRole('button',{name:'Recommend a facility',exact:true}).click());assert.ok(f.recommendedFacilityId);
  await p.getByText('✦ AI pick',{exact:true}).waitFor();
  pass('destination recommendation renders its AI pick among routed hospitals');
  await p.setViewportSize({width:390,height:844});await p.getByRole('button',{name:'Open the AI assistant',exact:true}).first().click();
  if(await p.getByRole('button',{name:'New chat',exact:true}).count())await p.getByRole('button',{name:'New chat',exact:true}).click();
  await p.getByRole('textbox',{name:'Ask a question…',exact:true}).fill('በዚህ ስርዓት ሪፈራል እንዴት እልካለሁ? በአማርኛ መልስ።');
  const am=await ai(p,'chat',async()=>{await p.getByRole('textbox',{name:'Ask a question…',exact:true}).fill('በዚህ ስርዓት ሪፈራል እንዴት እልካለሁ? በአማርኛ መልስ።');await p.getByRole('button',{name:'Send',exact:true}).click();});assert.match(am.reply,/[\u1200-\u137f]/);
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await p.screenshot({path:'/tmp/erl-ai-review-mobile.png'});
  pass('mobile full-screen assistant replies in Amharic without overflow');

  const a=await login('dr.abdi');await a.goto(site+'/consultations/new');
  await a.getByRole('textbox',{name:'Find the best colleague with AI',exact:true}).fill('I need advice about a child with suspected nephrotic syndrome.');
  const m=await ai(a,'match-colleague',()=>a.getByRole('button',{name:'Find a match',exact:true}).click());assert.ok(m.matches.length);
  await a.getByRole('button',{name:'Select',exact:true}).first().click();
  assert.equal(await a.getByLabel('Facility',{exact:true}).inputValue(),m.matches[0].facilityId);
  await a.waitForFunction(id=>document.querySelector('[aria-label="Consulting doctor"]')?.value===id,m.matches[0].id);
  const draft=await ai(a,'draft',()=>a.getByRole('button',{name:'Draft the message',exact:true}).click());
  assert.equal(await a.getByLabel('Opening message',{exact:false}).inputValue(),draft.message);
  assert.ok(a.url().endsWith('/consultations/new'));
  pass('AI colleague selection fills the directory; draft remains editable and unsent');
  await a.screenshot({path:'/tmp/erl-ai-review-colleague.png',fullPage:true});

  // Exercise a real accepted thread with a predictable seeded colleague.
  await a.getByLabel('Facility',{exact:true}).selectOption({label:'Zewditu Memorial Hospital'});
  await a.getByLabel('Doctor name',{exact:true}).fill('Samuel');
  await a.getByLabel('Consulting doctor',{exact:false}).selectOption({label:'Dr Samuel Worku · Internal Medicine'});
  await a.getByRole('button',{name:'Send consultation request',exact:true}).click();await a.waitForURL(/\/consultations\/[a-f0-9-]{36}$/);
  const b=await login('dr.samuel');await b.goto(a.url());await b.getByRole('button',{name:'Accept consultation',exact:true}).click();
  await b.getByLabel('Your message',{exact:false}).fill('Please provide the synthetic lab results before I advise.');
  const reply=await ai(b,'draft',()=>b.getByRole('button',{name:'Draft a reply',exact:true}).click());
  assert.equal(await b.getByLabel('Your message',{exact:false}).inputValue(),reply.message);
  assert.equal(await a.getByText(reply.message,{exact:true}).count(),0);
  await b.getByRole('button',{name:'Send message',exact:true}).click();await a.getByText(reply.message,{exact:true}).waitFor({timeout:15000});
  pass('consultation reply draft is sent only on explicit Send and reaches the other doctor');
  assert.deepEqual(errors,[]);pass('no uncaught browser errors');
  console.log(`${checks} real AI browser checks passed`);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
