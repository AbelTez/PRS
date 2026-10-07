import { useCallback, useEffect, useRef, useState } from 'react';
import { create } from 'zustand';
import { get, post, useAuth, DEMO_MODE } from '../lib';
import { useLang } from '../i18n';

const OFF = { enabled: false, features: {} };
const EMPTY = { data: null, busy: false, error: null };
let statusGeneration = 0;
let statusPending = null;

export const useAiStore = create((set, getState) => ({
  status: null, ownerId: null, panelOpen: false, pendingQuestion: null,
  messages: [], chatGeneration: 0,
  reset() {
    statusGeneration++; statusPending = null;
    set(s => ({ status: null, ownerId: null, panelOpen: false, pendingQuestion: null, messages: [], chatGeneration: s.chatGeneration + 1 }));
  },
  async load(user) {
    if (getState().ownerId !== (user?.id || null)) {
      getState().reset(); set({ ownerId: user?.id || null });
    }
    if (!user || DEMO_MODE || user.role === 'patient') { set({ status: OFF }); return; }
    if (getState().status) return;
    if (statusPending) return statusPending;
    const generation = statusGeneration;
    statusPending = get('/v1/ai/status').then(status => {
      if (generation === statusGeneration) set({ status });
    }).catch(() => {
      if (generation === statusGeneration) set({ status: OFF });
    }).finally(() => { if (generation === statusGeneration) statusPending = null; });
    return statusPending;
  },
  openPanel(question = null) { set({ panelOpen: true, pendingQuestion: question }); },
  closePanel() { set({ panelOpen: false }); },
  takePending() { const q = getState().pendingQuestion; set({ pendingQuestion: null }); return q; },
  addMessage(message) { set(s => ({ messages: [...s.messages, message] })); },
  clearChat() { set(s => ({ messages: [], chatGeneration: s.chatGeneration + 1 })); },
}));

// Clear private state immediately on logout, expiry or account/session change,
// including when no assistant component is mounted.
useAuth.subscribe((next, previous) => {
  if (next.token !== previous.token || next.user?.id !== previous.user?.id) useAiStore.getState().reset();
});

export function useAiStatus() {
  const user = useAuth(s => s.user);
  const { status, ownerId, load } = useAiStore();
  useEffect(() => { load(user); }, [user, load]);
  const s = ownerId === user?.id ? status || OFF : OFF;
  return { ...s, on: feature => !!s.enabled && (!feature || !!s.features?.[feature]) };
}

// contextKey changes whenever the case/form being assisted changes. Discard
// responses after edits, reset, navigation, logout or a newer request.
export function useAiCall(path, contextKey = '') {
  const lang = useLang(s => s.lang);
  const token = useAuth(s => s.token);
  const key = JSON.stringify([path, contextKey, lang, token]);
  const latest = useRef(key); latest.current = key;
  const version = useRef(0);
  const [state, setState] = useState(EMPTY);
  const reset = useCallback(() => { version.current++; setState(EMPTY); }, []);
  useEffect(() => { reset(); return () => { version.current++; }; }, [key, reset]);
  const run = useCallback(async body => {
    const request = ++version.current;
    const valid = () => request === version.current && latest.current === key && useAuth.getState().token === token;
    setState({ data: null, busy: true, error: null });
    try {
      const data = await post(`/v1/ai/${path}`, { ...body, lang });
      if (!valid()) return null;
      setState({ data, busy: false, error: null }); return data;
    } catch (error) {
      if (valid()) setState({ data: null, busy: false, error });
      return null;
    }
  }, [path, lang, key, token]);
  return { ...state, run, reset };
}
