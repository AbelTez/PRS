import React, { useEffect, useRef, useState } from 'react';
import { get, post, useAuth } from '../lib';
import { Button, ErrorBox, Notice } from '../ui';

export default function CallPanel({ consultationId, call, onEnd }) {
  const user = useAuth(s => s.user);
  const localVideo = useRef(null), remoteVideo = useRef(null);
  const connection = useRef(null), media = useRef(null);
  const [state, setState] = useState('Preparing your call…');
  const [error, setError] = useState(null);
  const [mic, setMic] = useState(true), [camera, setCamera] = useState(call.mode === 'video');
  const [relay, setRelay] = useState(true), [remoteReady, setRemoteReady] = useState(false);
  const endpoint = `/v1/consultations/${consultationId}/calls/${call.id}`;
  const endRef = useRef(onEnd); endRef.current = onEnd;

  useEffect(() => {
    let alive = true, joined = false, pc, stream, timer, heartbeat, cursor = '0', queued = [], sendQueue = Promise.resolve();
    const stopMedia = () => {
      stream?.getTracks().forEach(t => t.stop());
      pc?.close();
      clearTimeout(timer); clearInterval(heartbeat);
    };
    const finish = () => { if (!alive) return; stopMedia(); endRef.current(); };
    const fail = err => {
      if (!alive) return;
      stopMedia();
      const reason = err?.name === 'NotAllowedError' ? 'Allow microphone and camera access in your browser, then try again.'
        : err?.name === 'NotFoundError' ? 'No microphone or camera was found. Check your device or try an audio call.'
        : err?.name === 'NotReadableError' ? 'Your camera or microphone is in use by another application.'
        : err?.message || 'The call could not connect. Please try again.';
      setError(new Error(reason));setState('Call could not connect');
      post(`${endpoint}/actions`, { action: 'end' }).catch(() => {});
    };
    const send = (kind, payload) => {
      const clientId = crypto.randomUUID();
      sendQueue = sendQueue.then(async () => {
        if (!alive) return;
        // Reuse the same id when retrying an interrupted request.
        try { await post(`${endpoint}/signals`, {kind,payload,clientId}); }
        catch (e) { if (e.status) throw e; await post(`${endpoint}/signals`, {kind,payload,clientId}); }
      });
      sendQueue.catch(fail);
      return sendQueue;
    };
    const poll = async () => {
      try {
        const data = await get(`${endpoint}/signals?after=${cursor}`);
        if (!alive) return;
        if (!['ringing','active'].includes(data.call.status)) return finish();
        for (const signal of data.signals) {
          if (!alive) return;
          if (signal.kind === 'candidate') {
            if (pc.remoteDescription) await pc.addIceCandidate(signal.payload);
            else queued.push(signal.payload);
          } else {
            await pc.setRemoteDescription(signal.payload);
            for (const candidate of queued) await pc.addIceCandidate(candidate);
            queued = [];
            if (signal.kind === 'offer') {
              await pc.setLocalDescription(await pc.createAnswer());
              await send('answer', pc.localDescription.toJSON());
            }
          }
          cursor = signal.id;
        }
        timer = setTimeout(poll, 1500);
      } catch (e) {
        if (!alive) return;
        if (e.status && e.status < 500) return fail(e);
        setState('Connection interrupted — reconnecting…');
        timer = setTimeout(poll, 3000);
      }
    };
    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia || !window.RTCPeerConnection) throw new Error('Calls need a supported browser and a secure HTTPS connection.');
        stream = await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true},video:call.mode==='video'?{width:{ideal:640},height:{ideal:480},frameRate:{ideal:20,max:24}}:false});
        if (!alive) {stream.getTracks().forEach(t=>t.stop());return;}
        media.current = stream;
        if (localVideo.current) localVideo.current.srcObject = stream;
        joined = true;
        const session = await post(`${endpoint}/actions`,{action:'join'});
        if (!alive) {stopMedia();return;}
        setRelay(session.relayConfigured);
        pc = new RTCPeerConnection({iceServers:session.iceServers});connection.current=pc;
        for(const track of stream.getTracks()) pc.addTrack(track,stream);
        pc.ontrack = event => {
          if (!alive) return;
          if (remoteVideo.current) {
            remoteVideo.current.srcObject=event.streams[0];
            remoteVideo.current.play().catch(()=>setState('Tap the remote video to hear the call'));
          }
          setRemoteReady(true);
        };
        pc.onicecandidate = event => {if(event.candidate && alive) send('candidate',event.candidate.toJSON());};
        pc.onconnectionstatechange = () => {
          if (!alive) return;
          if(pc.connectionState==='connected') setState('Connected');
          if(pc.connectionState==='disconnected') setState('Connection interrupted — reconnecting…');
          if(pc.connectionState==='failed') fail(new Error('The call could not connect on this network. Try another network or contact your administrator.'));
        };
        heartbeat=setInterval(()=>post(`${endpoint}/actions`,{action:'heartbeat'}).then(r=>{
          if(!['ringing','active'].includes(r.call.status)) finish();
        }).catch(e=>{if(e.status===409 || e.status===403 || e.status===401) finish();}),10000);
        setState(call.started_by===user.id?'Calling — waiting for the other doctor…':'Connecting…');
        if(call.started_by===user.id) {
          await pc.setLocalDescription(await pc.createOffer());
          await send('offer',pc.localDescription.toJSON());
        }
        if(alive) poll();
      } catch(e) {fail(e);}
    })();
    return () => {
      alive=false;stopMedia();
      if (joined) post(`${endpoint}/actions`,{action:'end'}).catch(()=>{});
    };
  }, [call.id, endpoint, user.id, call.mode, call.started_by]);

  function toggle(kind) {
    const tracks = kind==='audio'?media.current?.getAudioTracks():media.current?.getVideoTracks();
    if (!tracks?.length) return;
    const enabled = !tracks[0].enabled;tracks.forEach(t=>{t.enabled=enabled;});
    if(kind==='audio') setMic(enabled); else setCamera(enabled);
  }
  return <section className="overflow-hidden rounded-2xl bg-slate-900 text-white shadow-erl-lg" aria-label="Live consultation call">
    <div className="flex items-center justify-between gap-3 p-4"><p role="status" className="font-semibold">{state}</p><span className="text-xs text-slate-300">{call.mode==='audio'?'Audio call':'Video call'} · No recording</span></div>
    <div className="relative min-h-64 bg-black">
      <video ref={remoteVideo} autoPlay playsInline onClick={e=>e.currentTarget.play().catch(()=>{})} className="h-80 w-full object-contain sm:h-96" aria-label="Other doctor" />
      {!remoteReady && <p className="absolute inset-0 flex items-center justify-center text-sm text-white/70">Waiting for the other doctor</p>}
      <video ref={localVideo} autoPlay playsInline muted className={`absolute bottom-3 right-3 h-24 w-32 rounded-xl bg-slate-800 object-cover ring-1 ring-white/30 ${camera?'':'opacity-30'}`} aria-label="Your camera preview" />
    </div>
    <div className="space-y-3 p-4">
      <ErrorBox error={error}/>
      {!relay && <Notice tone="warn">Calls may not connect on some hospital or mobile networks. If this happens, contact your administrator.</Notice>}
      <div className="flex flex-wrap justify-center gap-2">
        <Button variant="ghost" onClick={()=>toggle('audio')} disabled={!!error} aria-pressed={!mic}>{mic?'Mute microphone':'Unmute microphone'}</Button>
        {call.mode==='video' && <Button variant="ghost" onClick={()=>toggle('video')} disabled={!!error} aria-pressed={!camera}>{camera?'Turn camera off':'Turn camera on'}</Button>}
        <Button variant="danger" onClick={()=>{media.current?.getTracks().forEach(t=>t.stop());connection.current?.close();post(`${endpoint}/actions`,{action:'end'}).finally(onEnd);}}>Leave call</Button>
      </div>
    </div>
  </section>;
}
