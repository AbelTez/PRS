import React, {useCallback, useEffect, useRef, useState} from 'react';
import {Link, useNavigate, useParams, useSearchParams} from 'react-router-dom';
import {get, post, useAuth, humanCode, timeAgo} from '../lib';
import {Button, Card, Field, Input, Select, Textarea, ErrorBox, Notice, Badge, Spinner, Empty} from '../ui';
import {PageHead} from '../brand';
import CallPanel from './CallPanel';

export const CONSULTATION_ROLES=['doctor','clinician','specialist'];
const names={requested:'Awaiting acceptance',active:'In progress',answered:'Opinion submitted',closed:'Closed',declined:'Declined',cancelled:'Cancelled'};
const openStatuses=['active','answered'];
const fmt=value=>new Date(value).toLocaleString();
function Status({value}) {return <Badge className={value==='requested'?'bg-ember-100 text-ember-800':'bg-brand-100 text-brand-800'}>{names[value]||humanCode(value)}</Badge>;}

export function ConsultationAlerts() {
  const [data,setData]=useState(null);
  useEffect(()=>{
    let alive=true,timer;
    async function tick(){try{const d=await get('/v1/consultations/inbox');if(alive)setData(d);}catch{} finally{if(alive)timer=setTimeout(tick,10000);}}
    tick();return()=>{alive=false;clearTimeout(timer);};
  },[]);
  if(!data?.calls?.length && !data?.unread)return null;
  return <aside className="border-b border-brand-200 bg-brand-50 px-4 py-2 text-sm" aria-live="polite"><div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3">
    {data.calls?.map(c=><Link key={c.id} to={`/consultations/${c.consultation_id}`} className="font-semibold text-brand-800">{c.caller_name} is calling · Open {c.mode} call →</Link>)}
    {!!data.unread && <Link to="/consultations" className="ml-auto font-medium text-brand-700">{data.unread} unread consultation{data.unread===1?'':'s'} →</Link>}
  </div></aside>;
}

export function ConsultationList() {
  const user=useAuth(s=>s.user);const [rows,setRows]=useState(null),[error,setError]=useState(null),[tab,setTab]=useState('all'),[offset,setOffset]=useState(0);
  useEffect(()=>{
    let alive=true,timer;
    async function tick(){try{const r=await get(`/v1/consultations?offset=${offset}`);if(alive){setRows(r);setError(null);}}catch(e){if(alive)setError(e);}finally{if(alive)timer=setTimeout(tick,10000);}}
    tick();return()=>{alive=false;clearTimeout(timer);};
  },[offset]);
  const shown=rows?.filter(r=>tab==='all'||tab==='received'&&r.consultant_id===user.id||tab==='sent'&&r.requester_id===user.id||tab==='closed'&&['closed','cancelled','declined'].includes(r.status));
  return <div className="mx-auto max-w-6xl space-y-5 p-4 py-6 sm:p-6">
    <PageHead eyebrow="Doctor to doctor" title="Consultations" lede="Connect with colleagues, discuss a case, share knowledge, or start a live call." actions={<Link to="/consultations/new"><Button>New consultation</Button></Link>}/>
    <ErrorBox error={error}/>
    <div className="flex flex-wrap gap-2" role="group" aria-label="Consultation filters">{['all','received','sent','closed'].map(t=><Button key={t} variant={tab===t?'primary':'ghost'} onClick={()=>setTab(t)} aria-pressed={tab===t}>{humanCode(t)}</Button>)}</div>
    {!rows?<Spinner/>:!shown.length?<Empty>No consultations here yet. Start a conversation with a verified doctor in the network.</Empty>:<div className="grid gap-3">
      {shown.map(r=><Link key={r.id} to={`/consultations/${r.id}`} className="block rounded-2xl bg-white p-5 shadow-erl-sm ring-1 ring-brand-200 transition hover:ring-brand-400">
        <div className="flex flex-wrap items-center gap-2"><Status value={r.status}/><span className="text-xs text-slate-500">{humanCode(r.topic)}</span>{r.priority==='urgent'&&<Badge className="bg-ember-100 text-ember-800">Urgent</Badge>}{r.unread_count>0&&<Badge className="bg-brand-600 text-white">{r.unread_count} new</Badge>}</div>
        <h2 className="mt-3 text-lg font-semibold">{r.title}</h2><p className="mt-1 text-sm text-slate-600">{r.requester_id===user.id?r.consultant_name:r.requester_name} · {r.requester_id===user.id?r.consultant_facility:r.requester_facility}</p>
        <p className="mt-2 line-clamp-2 whitespace-pre-wrap text-sm text-slate-600">{r.summary}</p><p className="mt-3 text-xs text-slate-400">Updated {timeAgo(r.updated_at)}</p>
      </Link>)}
    </div>}
    <div className="flex justify-between"><Button variant="ghost" disabled={!offset} onClick={()=>setOffset(Math.max(0,offset-50))}>Previous</Button><Button variant="ghost" disabled={!rows||rows.length<50} onClick={()=>setOffset(offset+50)}>Next</Button></div>
  </div>;
}

export function NewConsultation() {
  const nav=useNavigate();const [params]=useSearchParams();
  const [doctors,setDoctors]=useState([]),[search,setSearch]=useState(''),[error,setError]=useState(null),[busy,setBusy]=useState(false);
  const [facilities,setFacilities]=useState([]),[facilitySearch,setFacilitySearch]=useState(''),[facilityId,setFacilityId]=useState('');
  const [specialties,setSpecialties]=useState([]),[specialty,setSpecialty]=useState('');
  const [facilitiesLoading,setFacilitiesLoading]=useState(true),[doctorsLoading,setDoctorsLoading]=useState(false),[patientsLoading,setPatientsLoading]=useState(true);
  const [patientSearch,setPatientSearch]=useState(''),[patients,setPatients]=useState([]);
  const [form,setForm]=useState({title:'',summary:'',topic:'general',priority:'routine',consultantId:'',patientId:'',referralId:params.get('referralId')||'',sharingConfirmed:false});
  const clientId=useRef(crypto.randomUUID());
  const field=(key,value)=>setForm(f=>({...f,[key]:value}));
  useEffect(()=>{let alive=true;get('/v1/consultations/facilities').then(r=>{if(alive)setFacilities(r);}).catch(e=>{if(alive)setError(e);}).finally(()=>{if(alive)setFacilitiesLoading(false);});return()=>{alive=false;};},[]);
  useEffect(()=>{
    let alive=true;setSpecialties([]);
    if(facilityId)get(`/v1/consultations/specialties?facilityId=${facilityId}`).then(r=>{if(alive)setSpecialties(r);}).catch(e=>{if(alive)setError(e);});
    return()=>{alive=false;};
  },[facilityId]);
  useEffect(()=>{
    let alive=true;setDoctors([]);setDoctorsLoading(!!facilityId);
    if(!facilityId)return()=>{alive=false;};
    const q=new URLSearchParams({facilityId,search,specialty});
    const t=setTimeout(()=>get(`/v1/consultations/doctors?${q}`).then(r=>{if(alive)setDoctors(r);}).catch(e=>{if(alive)setError(e);}).finally(()=>{if(alive)setDoctorsLoading(false);}),250);
    return()=>{alive=false;clearTimeout(t);};
  },[facilityId,search,specialty]);
  useEffect(()=>{let alive=true;setPatients([]);setPatientsLoading(true);const t=setTimeout(()=>get(`/v1/consultations/patients?search=${encodeURIComponent(patientSearch)}`).then(r=>{if(alive)setPatients(r);}).catch(e=>{if(alive)setError(e);}).finally(()=>{if(alive)setPatientsLoading(false);}),300);return()=>{alive=false;clearTimeout(t);};},[patientSearch]);
  const resetDoctor=()=>setForm(f=>({...f,consultantId:'',sharingConfirmed:false}));
  function chooseFacility(value){setFacilityId(value);setSpecialty('');setSearch('');setDoctors([]);setSpecialties([]);resetDoctor();}
  const matchingFacilities=facilities.filter(f=>`${f.name_lat} ${f.name_am||''}`.toLocaleLowerCase().includes(facilitySearch.trim().toLocaleLowerCase()));
  async function submit(e){e.preventDefault();setBusy(true);setError(null);try{const r=await post('/v1/consultations',{...form,clientId:clientId.current});nav(`/consultations/${r.id}`);}catch(e){setError(e);}finally{setBusy(false);}}
  return <div className="mx-auto max-w-4xl space-y-5 p-4 py-6 sm:p-6"><PageHead eyebrow="Doctor to doctor" title="Start a consultation" lede="Talk about any topic. Link a patient or referral only when it helps the discussion."/>
    <form onSubmit={submit} className="space-y-5"><ErrorBox error={error}/>
      <Card title="Choose a colleague" subtitle="Choose their facility, then find the doctor or specialist you want to ask for advice."><div className="space-y-4">
      <Field label="Search facilities" hint="Browse all registered active facilities or type a facility name."><Input aria-label="Search facilities" value={facilitySearch} onChange={e=>{setFacilitySearch(e.target.value);chooseFacility('');}} placeholder="e.g. Black Lion, Zewditu or Ambo"/></Field>
      <Field label="Facility" required><Select aria-label="Facility" required disabled={facilitiesLoading} value={facilityId} onChange={e=>chooseFacility(e.target.value)}><option value="">{facilitiesLoading?'Loading facilities…':'Choose a facility'}</option>{matchingFacilities.map(f=><option key={f.id} value={f.id}>{f.name_lat}</option>)}</Select></Field>
      {!facilitiesLoading&&!matchingFacilities.length&&<p role="status" className="text-sm text-slate-500">No facilities match. Try another name.</p>}
      <div className="grid gap-4 sm:grid-cols-2"><Field label="Specialty" hint="Specialties available at the selected facility"><Select aria-label="Specialty" disabled={!facilityId} value={specialty} onChange={e=>{setSpecialty(e.target.value);setDoctors([]);resetDoctor();}}><option value="">All specialties</option>{specialties.map(s=><option key={s.specialty} value={s.specialty}>{s.specialty}</option>)}</Select></Field>
      <Field label="Doctor name"><Input aria-label="Doctor name" disabled={!facilityId} value={search} onChange={e=>{setSearch(e.target.value);setDoctors([]);resetDoctor();}} placeholder="Type all or part of a name"/></Field></div>
      <Field label="Consulting doctor" required><Select aria-label="Consulting doctor" required disabled={!facilityId||doctorsLoading} value={form.consultantId} onChange={e=>setForm(f=>({...f,consultantId:e.target.value,sharingConfirmed:false}))}><option value="">{!facilityId?'Choose a facility first':doctorsLoading?'Loading doctors…':'Select a verified doctor'}</option>{doctors.map(d=><option key={d.id} value={d.id}>{d.full_name} · {d.specialty}</option>)}</Select></Field>
      {facilityId&&!doctorsLoading&&!doctors.length&&<p role="status" className="text-sm text-slate-500">No available doctors match at this facility. Try another name, specialty, or facility.</p>}
      {doctors.length===100&&<p className="text-sm text-slate-500">Showing the first 100 matches. Search by name to narrow the list.</p>}
      </div></Card>
      <Card title="What would you like to discuss?"><div className="space-y-4"><Field label="Title" required><Input required maxLength={160} value={form.title} onChange={e=>field('title',e.target.value)} placeholder="Give your conversation a clear title"/></Field>
      <div className="grid gap-4 sm:grid-cols-2"><Field label="Topic"><Select value={form.topic} onChange={e=>field('topic',e.target.value)}>{['general','patient_case','second_opinion','learning'].map(t=><option key={t} value={t}>{humanCode(t)}</option>)}</Select></Field><Field label="Priority"><Select value={form.priority} onChange={e=>field('priority',e.target.value)}><option value="routine">Routine</option><option value="urgent">Urgent</option></Select></Field></div>
      <Field label="Opening message" hint="Introduce the topic, ask your question, or describe what you want to discuss on the call."><Textarea rows={5} maxLength={10000} value={form.summary} onChange={e=>field('summary',e.target.value)}/></Field>
      {form.priority==='urgent'&&<Notice tone="warn">The other doctor may be offline. This request does not guarantee an immediate response.</Notice>}</div></Card>
      <Card title="Optional clinical context" subtitle="Only information you include here is shared with the other doctor."><div className="space-y-4">
        <Field label="Find a patient from your facility" hint="Choose a recent patient below, or search by name. Sample records are marked Test patient."><Input value={patientSearch} onChange={e=>{setPatientSearch(e.target.value);setForm(f=>({...f,patientId:'',sharingConfirmed:false}));}} placeholder="Search patient name (optional)"/></Field>
        <Field label="Patient"><Select aria-label="Patient" disabled={patientsLoading||!!form.referralId} value={form.patientId} onChange={e=>setForm(f=>({...f,patientId:e.target.value,sharingConfirmed:false}))}><option value="">{form.referralId?'Patient from the linked referral':patientsLoading?'Loading patients…':'No patient — general conversation'}</option>{patients.map(p=><option key={p.id} value={p.id}>{p.is_test_data?'[Test patient] ':''}{p.name}{p.age_value!=null?` · ${p.age_value} ${p.age_unit}`:''} · {p.sex}</option>)}</Select></Field>
        {!patientsLoading&&!patients.length&&<p role="status" className="text-sm text-slate-500">No patients found at your facility. Try another name.</p>}
        {patients.length===50&&<p className="text-sm text-slate-500">Showing 50 recent matches. Search by name to find another patient.</p>}
        {form.referralId&&<Notice>A referral is linked to this request. Its full chart is not automatically shared. <button type="button" onClick={()=>field('referralId','')} className="font-semibold underline">Remove link</button></Notice>}
        {(form.patientId||form.referralId)&&<label className="flex items-start gap-3 text-sm"><input className="mt-1 h-5 w-5" type="checkbox" required checked={form.sharingConfirmed} onChange={e=>field('sharingConfirmed',e.target.checked)}/>I confirm I am authorized to share this patient context with the selected doctor.</label>}
      </div></Card>
      <Notice>Once your colleague accepts, you can exchange documents and start video or audio calls.</Notice>
      <div className="flex gap-3"><Button disabled={busy||!form.consultantId} type="submit">{busy?'Sending…':'Send consultation request'}</Button><Link to="/consultations"><Button variant="ghost" type="button">Cancel</Button></Link></div>
    </form>
  </div>;
}

export function ConsultationDetail() {
  const {id}=useParams();const user=useAuth(s=>s.user);
  const [data,setData]=useState(null),[messages,setMessages]=useState([]),[error,setError]=useState(null),[busy,setBusy]=useState(false);
  const [body,setBody]=useState(''),[kind,setKind]=useState('message'),[note,setNote]=useState(''),[call,setCall]=useState(null);
  const cursor=useRef('0'), readCursor=useRef(null),pending=useRef(null);
  const url=`/v1/consultations/${id}`;
  const refresh=useCallback(async()=>{const r=await get(url);setData(r);return r;},[url]);
  useEffect(()=>{
    let alive=true,timer;cursor.current='0';readCursor.current=null;setMessages([]);setData(null);setCall(null);
    async function tick(){
      try {
        const r=await get(url);let batch=await get(`${url}/messages?after=${cursor.current}`);
        if(!alive)return;
        setData(r);setMessages(old=>{const known=new Set(old.map(m=>m.id));return [...old,...batch.filter(m=>!known.has(m.id))];});
        if(batch.length)cursor.current=batch[batch.length-1].id;
        if(document.visibilityState==='visible'&&readCursor.current!==cursor.current){await post(`${url}/read`,{through:cursor.current});readCursor.current=cursor.current;}
        if(alive)timer=setTimeout(tick,batch.length===100?0:4000);
      }catch(e){if(alive){setError(e);timer=setTimeout(tick,8000);}}
    }
    tick();return()=>{alive=false;clearTimeout(timer);};
  },[url]);
  async function act(action){setBusy(true);setError(null);try{await post(`${url}/actions`,{action,note});setNote('');await refresh();}catch(e){setError(e);}finally{setBusy(false);}}
  async function send(e){e.preventDefault();setBusy(true);setError(null);try{
    if(!pending.current||pending.current.body!==body||pending.current.kind!==kind)pending.current={body,kind,clientId:crypto.randomUUID()};
    await post(`${url}/messages`,pending.current);pending.current=null;setBody('');setKind('message');await refresh();
  }catch(e){setError(e);}finally{setBusy(false);}}
  async function attach(e){const file=e.target.files[0];e.target.value='';if(!file)return;
    if(file.size>1500000){setError(new Error('Choose a file smaller than 1.5 MB.'));return;}
    setBusy(true);setError(null);try{const dataUrl=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(file);});await post(`${url}/attachments`,{name:file.name,dataUrl,clientId:crypto.randomUUID()});await refresh();}catch(e){setError(e);}finally{setBusy(false);}}
  async function download(a){try{const base=import.meta.env.VITE_API_BASE||(import.meta.env.PROD?'/api':'');const r=await fetch(`${base}${url}/attachments/${a.id}`,{headers:{Authorization:`Bearer ${useAuth.getState().token}`}});if(!r.ok)throw new Error('Unable to download this document');const link=document.createElement('a');link.href=URL.createObjectURL(await r.blob());link.download=a.file_name;link.click();setTimeout(()=>URL.revokeObjectURL(link.href),1000);}catch(e){setError(e);}}
  async function start(mode){setBusy(true);setError(null);try{const c=await post(`${url}/calls`,{mode});if(c.started_by!==user.id)await refresh();else setCall(c);}catch(e){setError(e);}finally{setBusy(false);}}
  if(!data)return <div className="p-6"><ErrorBox error={error}/>{!error&&<Spinner/>}</div>;
  const consultant=data.consultant_id===user.id,open=openStatuses.includes(data.status),live=data.calls.find(c=>['ringing','active'].includes(c.status));
  return <div className="mx-auto max-w-6xl space-y-5 p-4 py-6 sm:p-6">
    <Link to="/consultations" className="text-sm font-semibold text-brand-700">← Consultations</Link>
    <PageHead eyebrow={humanCode(data.topic)} title={data.title} lede={`${data.requester_name} · ${data.requester_facility} ↔ ${data.consultant_name} · ${data.consultant_facility}`} actions={<Status value={data.status}/>}/>
    <ErrorBox error={error} onDismiss={()=>setError(null)}/>
    {call&&<CallPanel key={call.id} consultationId={id} call={call} onEnd={()=>{setCall(null);refresh().catch(setError);}}/>}
    {open&&!call&&<Card title="Talk live" subtitle="Start a private video or audio call with your colleague.">
      {live&&live.started_by!==user.id?<div className="flex flex-wrap items-center gap-3"><p className="text-sm">{live.status==='ringing'?'Your colleague is calling.':'A call is in progress.'}</p><Button onClick={()=>setCall(live)}>Join {live.mode} call</Button>{live.status==='ringing'&&<Button variant="ghost" onClick={()=>post(`${url}/calls/${live.id}/actions`,{action:'decline'}).then(refresh).catch(setError)}>Decline call</Button>}</div>
      :live?<Notice>Your call is open in another window. <button className="font-semibold underline" onClick={()=>post(`${url}/calls/${live.id}/actions`,{action:'end'}).then(refresh).catch(setError)}>End that call</button> to start again.</Notice>
      :<div className="flex gap-3"><Button disabled={busy} onClick={()=>start('video')}>Start video call</Button><Button variant="ghost" disabled={busy} onClick={()=>start('audio')}>Start audio call</Button></div>}
    </Card>}
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="space-y-5"><Card title="Conversation"><div className="space-y-4">
        {data.summary&&<div className="rounded-xl bg-brand-50 p-4"><p className="text-xs font-semibold text-brand-700">{data.requester_name} · Opening message</p><p className="mt-2 whitespace-pre-wrap break-words text-sm">{data.summary}</p></div>}
        <div className="max-h-[32rem] space-y-3 overflow-y-auto pr-1" aria-label="Messages">{messages.map(m=><article key={m.id} className={`rounded-xl p-4 ${m.kind==='opinion'?'bg-emerald-50 ring-1 ring-emerald-200':m.author_id===user.id?'ml-4 bg-brand-50':'mr-4 bg-slate-100'}`}>
          <p className="text-xs font-semibold text-slate-600">{m.author_name} · {fmt(m.created_at)}{m.kind==='opinion'?' · Opinion / summary':''}</p><p className="mt-2 whitespace-pre-wrap break-words text-sm">{m.body}</p>
        </article>)}</div>
        {open?<form onSubmit={send} className="space-y-3 border-t border-slate-200 pt-4">
          {consultant&&<Field label="Message type"><Select value={kind} onChange={e=>setKind(e.target.value)}><option value="message">Message</option><option value="opinion">Opinion / discussion summary</option></Select></Field>}
          <Field label="Your message"><Textarea required rows={3} maxLength={10000} value={body} onChange={e=>setBody(e.target.value)} placeholder="Continue the conversation…"/></Field><Button type="submit" disabled={busy||!body.trim()}>{busy?'Sending…':'Send message'}</Button>
        </form>:<Notice>{data.status==='requested'?'Messaging and calls become available when the invited doctor accepts.':'This conversation is read-only.'}</Notice>}
      </div></Card>
      <Card title="Documents" subtitle="JPEG, PNG or PDF · up to 1.5 MB per file"><div className="space-y-3">{data.attachments.map(a=><button key={a.id} onClick={()=>download(a)} className="block w-full break-all rounded-xl bg-slate-50 p-3 text-left text-sm font-medium text-brand-700">↓ {a.file_name} <span className="font-normal text-slate-500">({Math.ceil(a.size_bytes/1024)} KB)</span></button>)}{!data.attachments.length&&<p className="text-sm text-slate-500">No documents shared yet.</p>}{open&&<Field label="Share a document"><input type="file" accept="image/jpeg,image/png,application/pdf" disabled={busy} onChange={attach} className="block w-full text-sm"/></Field>}</div></Card>
      </div>
      <aside className="space-y-5">
        <Card title="Details"><dl className="space-y-3 text-sm"><div><dt className="text-slate-500">Priority</dt><dd>{humanCode(data.priority)}</dd></div><div><dt className="text-slate-500">Started</dt><dd>{fmt(data.created_at)}</dd></div><div><dt className="text-slate-500">Patient context</dt><dd>{data.patient_name||'General conversation — no patient linked'}</dd></div>{data.referral_code&&<div><dt className="text-slate-500">Linked referral</dt><dd>{data.referral_code}</dd></div>}</dl></Card>
        <Card title="Next steps"><div className="space-y-3">
          {data.status==='requested'&&consultant&&<><Button disabled={busy} onClick={()=>act('accept')}>Accept consultation</Button><Field label="Reason for declining"><Textarea rows={2} maxLength={2000} value={note} onChange={e=>setNote(e.target.value)}/></Field><Button variant="ghost" disabled={busy||!note.trim()} onClick={()=>act('decline')}>Decline request</Button></>}
          {data.status==='requested'&&!consultant&&<Button variant="ghost" disabled={busy} onClick={()=>act('cancel')}>Cancel request</Button>}
          {open&&!consultant&&<><Field label="Closing note (optional)"><Textarea rows={2} maxLength={2000} value={note} onChange={e=>setNote(e.target.value)}/></Field><Button disabled={busy} onClick={()=>act('close')}>{data.status==='answered'?'Acknowledge and close':'Close conversation'}</Button></>}
          {!consultant&&data.patient_id&&<Link className="block text-sm font-semibold text-brand-700" to={`/new?consultationId=${id}`}>Create a referral from this discussion →</Link>}
          {data.referrals?.map(r=>consultant?<p key={r.id} className="text-sm text-slate-600">Referral created: {r.referral_code}</p>:<Link key={r.id} className="block text-sm font-semibold text-brand-700" to={`/referrals/${r.id}`}>Referral {r.referral_code} →</Link>)}
          {['closed','declined','cancelled'].includes(data.status)&&<Link to="/consultations/new" className="text-sm font-semibold text-brand-700">Start another consultation →</Link>}
          {open&&consultant&&<p className="text-sm text-slate-500">Share an opinion or summary in the conversation. The requesting doctor can acknowledge and close it.</p>}
        </div></Card>
        <Card title="Activity"><ol className="max-h-80 space-y-3 overflow-y-auto text-xs">{data.events.map(e=><li key={e.id}><p className="font-semibold text-slate-700">{humanCode(e.event)}</p><p className="text-slate-500">{e.actor_name} · {timeAgo(e.created_at)}</p>{e.note&&<p className="mt-1 whitespace-pre-wrap break-words text-slate-600">{e.note}</p>}</li>)}</ol></Card>
      </aside>
    </div>
  </div>;
}
