// Deterministic boundary tests: no database or external provider required.
const assert = require('node:assert/strict');
const { AiService, plain } = require('../dist/ai/ai.service');
const { GeminiClient } = require('../dist/ai/gemini.client');
const { redact, redactNames } = require('../dist/ai/redact');
const doctor = { id:'doctor', role:'doctor', facilityId:'origin', facilityTier:2 };
let checks=0;
const pass=name=>console.log(`PASS ${++checks} ${name}`);
const meta={model:'fixture',text:'',latencyMs:10,tokensIn:12,tokensOut:8};
function fixture(output={}) {
  const prompts=[], logs=[], queries=[];
  const reasons=[{code:'valid_reason',name_lat:'Valid reason',category:'general',default_urgency:'urgent'}];
  const db={query:async(sql)=>{queries.push(sql);return sql.includes('FROM reason_code')?reasons:[{id:'doctor-2',facility_id:'f2',full_name:'Test doctor',specialty:'Paediatrics'}];},one:async()=>reasons[0]};
  const model={enabled:true,model:'fixture',generateJson:async(req)=>{prompts.push(req);return {data:output,meta};},generate:async(req)=>{prompts.push(req);return {...meta,text:'Example reply'};}};
  let routeRequest;
  const routing={suggest:async(req)=>{routeRequest=req;return {urgency:'urgent',candidates:[{facilityId:'allowed',name:'Registered hospital'}]};}};
  return {service:new AiService(db,{record:async log=>logs.push(log)},model,routing),model,prompts,logs,queries,get routeRequest(){return routeRequest;}};
}
(async()=>{
  assert.equal(redact('contact 0911223344, +251911223344, test@example.com ID 123456789012'), 'contact [phone], [phone], [email] ID [id]');
  assert.equal(redact('123456789012',5),'[id]');
  assert.equal(redactNames('Test Patient has fever',['Test Patient']),'[name] has fever');
  assert.equal(plain('$MgSO_4$ \\geq 10'),'MgSO4 ≥ 10');
  pass('identifiers are redacted before truncation; clinical notation stays readable');

  for(const role of ['patient','it_admin','woreda','regional','national']){
    const f=fixture(); assert.equal(f.service.status({...doctor,role}).enabled,false);
    await assert.rejects(f.service.chat({...doctor,role},{messages:[{text:'hello'}]}), e=>e.getStatus()===403);
    assert.equal(f.prompts.length,0);
  }
  const f=fixture();f.model.enabled=false;
  await assert.rejects(f.service.caseAssist(doctor,{presentingComplaint:'fever'}), e=>e.getStatus()===503);
  assert.equal(f.queries.length,0);
  pass('excluded roles and disabled AI never reach data queries or Gemini');

  const reception=fixture();
  for(const method of ['caseAssist','matchFacility','matchColleague']) await assert.rejects(reception.service[method]({...doctor,role:'liaison'},{}),e=>e.getStatus()===403);
  await assert.rejects(reception.service.draft({...doctor,role:'liaison'},{kind:'consult_request'}),e=>e.getStatus()===403);
  pass('reception cannot invoke clinical matching or consultation drafting');

  const c=fixture({diagnoses:[],urgency:'invented',reasonCode:'invented'});
  const result=await c.service.caseAssist(doctor,{presentingComplaint:'Test Patient fever 0911223344',redactNames:['Test Patient'],sex:'leaked-name',ageUnit:'leaked-id',vitals:{pulse:'leaked-phone'}});
  assert.equal(result.urgency,null);assert.equal(result.reason,null);
  assert.ok(!JSON.stringify(c.prompts).match(/Test Patient|0911223344|leaked-/));
  assert.ok(!JSON.stringify(c.logs).includes('fever'));
  pass('case input strips known names and rejects malformed structured fields; audits omit prompts');

  const hospital=fixture({recommendedFacilityId:'allowed',runnerUpFacilityId:'forged',suggestedOverrideReason:'forged'});
  const selected=await hospital.service.matchFacility(doctor,{reasonCode:'valid_reason',candidates:[{facilityId:'forged',name:'Fake hospital'}],originFacilityId:'fake',overrideReasons:['forged']});
  assert.equal(selected.recommendedFacilityId,'allowed');assert.equal(selected.runnerUpFacilityId,null);
  assert.equal(selected.suggestedOverrideReason,null);assert.equal(hospital.routeRequest.originFacilityId,'origin');
  assert.ok(!JSON.stringify(hospital.prompts).includes('Fake hospital'));
  await assert.rejects(fixture({recommendedFacilityId:'forged'}).service.matchFacility(doctor,{reasonCode:'valid_reason'}),e=>e.getStatus()===503);
  pass('facility choices come only from authoritative routing; invented picks are rejected');

  const match=await fixture({matches:[{ref:'invented-D1',why:'wrong'},{ref:'D1',why:'valid'},{ref:'D1',why:'duplicate'},{ref:'D999',why:'missing'}]}).service.matchColleague(doctor,{question:'synthetic question'});
  assert.equal(match.matches.length,1);assert.equal(match.matches[0].why,'valid');
  pass('colleague references must match exactly and cannot repeat');

  const draft=await fixture({message:'Line one\\nLine two'}).service.draft(doctor,{kind:'follow_up',context:{}});
  assert.equal(draft.message,'Line one\nLine two');
  pass('double-escaped draft newlines are normalized');

  const limited=fixture();process.env.AI_RATE_PER_MIN='2';
  for(let i=0;i<2;i++) await limited.service.chat(doctor,{messages:[{text:'hello'}]});
  await assert.rejects(limited.service.chat(doctor,{messages:[{text:'hello'}]}),e=>e.getStatus()===429);
  assert.equal(limited.prompts.length,2);delete process.env.AI_RATE_PER_MIN;
  pass('per-user rate limit rejects excess requests before provider calls');

  const savedFetch=global.fetch,savedNow=Date.now,savedTimeout=AbortSignal.timeout;
  const oldEnv={...process.env};
  try {
    process.env.AI_ENABLED='true';process.env.GEMINI_API_KEY='synthetic-test-key';
    process.env.AI_MODEL='first';process.env.AI_FALLBACK_MODELS='second';process.env.AI_TIMEOUT_MS='20000';
    let time=0;const budgets=[];Date.now=()=>time;
    AbortSignal.timeout=ms=>{budgets.push(ms);return new AbortController().signal;};
    let attempts=0;
    global.fetch=async()=>{attempts++;time+=15000;return attempts===1?new Response('{}',{status:503}):new Response(JSON.stringify({candidates:[{content:{parts:[{text:'answer'}]}}]}));};
    const reply=await new GeminiClient().generate({system:'test',turns:[{role:'user',text:'test'}]});
    assert.equal(reply.model,'second');assert.deepEqual(budgets,[10000,5000]);
    pass('fallback attempts share one timeout budget and reserve time for later models');
    const client=new GeminiClient();
    for(const text of ['null','[]','42','broken']){
      client.generate=async()=>({...meta,text});
      await assert.rejects(client.generateJson({system:'',turns:[]}),e=>e.getStatus()===503);
    }
    pass('invalid structured provider replies become recoverable errors');
  } finally {global.fetch=savedFetch;Date.now=savedNow;AbortSignal.timeout=savedTimeout;process.env=oldEnv;}
  console.log(`\n${checks} AI boundary checks passed.`);
})().catch(e=>{console.error(e);process.exitCode=1;});
