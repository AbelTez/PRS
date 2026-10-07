import React, { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { post, useAuth } from '../lib';
import { useT } from '../i18n';
import { Icon } from '../brand';
import { useAiStore, useAiStatus } from './useAi';
import { AiText, AiError } from './AiParts';

/* ============================================================================
   ASSISTANT PANEL — the right-hand chatbot
   ----------------------------------------------------------------------------
   Docked on the right from `lg` up (the page stays usable beside it), full
   screen on phones. The conversation lives for the browser session only and
   is never stored on the server. It knows the current page, never the patient.
   ========================================================================== */


function pageName(path) {
  if (path.startsWith('/new')) return 'New referral form';
  if (/^\/referrals\/.+/.test(path)) return 'Referral detail';
  if (path.startsWith('/referrals')) return 'Referral list';
  if (path.startsWith('/consultations/new')) return 'New consultation';
  if (/^\/consultations\/.+/.test(path)) return 'Consultation conversation';
  if (path.startsWith('/consultations')) return 'Consultations list';
  if (path.startsWith('/dashboard')) return 'Dashboard';
  if (path.startsWith('/availability')) return 'Availability board';
  if (path.startsWith('/it')) return 'Staff accounts';
  return 'Home';
}

/** Launcher: floating bubble on desktop; the top bar has its own button on phones. */
export function AssistantLauncher() {
  const t = useT();
  const ai = useAiStatus();
  const { panelOpen, openPanel } = useAiStore();
  if (!ai.on('chat') || panelOpen) return null;
  return (
    <button type="button" onClick={() => openPanel()} aria-label={t('ai.open')}
            className="fixed bottom-6 right-6 z-40 hidden items-center gap-2 rounded-full bg-gradient-to-br from-violet-600 to-brand-700 py-3 pl-4 pr-5 text-sm font-semibold text-white shadow-erl-lg ring-4 ring-white transition hover:-translate-y-0.5 md:flex">
      <Icon name="sparkle" className="h-5 w-5" />{t('ai.assistant')}
    </button>
  );
}

/** Top-bar icon button (all widths). */
export function AssistantTopButton() {
  const t = useT();
  const ai = useAiStatus();
  const { panelOpen, openPanel, closePanel } = useAiStore();
  if (!ai.on('chat')) return null;
  return (
    <button type="button" onClick={() => (panelOpen ? closePanel() : openPanel())} aria-pressed={panelOpen}
            aria-label={t('ai.open')} title={t('ai.assistant')}
            className={`flex h-10 w-10 items-center justify-center rounded-xl transition
              ${panelOpen ? 'bg-violet-100 text-violet-700' : 'text-violet-600 hover:bg-violet-50'}`}>
      <Icon name="sparkle" className="h-5 w-5" />
    </button>
  );
}

export default function AssistantPanel() {
  const t = useT();
  const loc = useLocation();
  const ai = useAiStatus();
  const { panelOpen, closePanel, takePending, pendingQuestion } = useAiStore();
  const { messages, addMessage: add, clearChat: clear, chatGeneration } = useAiStore();
  const requestRef = useRef(0);
  useEffect(() => { requestRef.current++; setBusy(false); setText(''); setError(null); }, [chatGeneration]);
  useEffect(() => () => { requestRef.current++; }, []);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const listRef = useRef(null);
  const inputRef = useRef(null);
  const page = pageName(loc.pathname);

  async function send(q) {
    const question = (q ?? text).trim();
    if (!question || busy) return;
    setText(''); setError(null);
    const next = [...useAiStore.getState().messages, { role: 'user', text: question }];
    add({ role: 'user', text: question });
    setBusy(true);
    const request = ++requestRef.current;
    const generation = useAiStore.getState().chatGeneration;
    const token = useAuth.getState().token;
    const valid = () => request === requestRef.current && generation === useAiStore.getState().chatGeneration && token === useAuth.getState().token;
    try {
      const r = await post('/v1/ai/chat', { messages: next, page });
      if (valid()) add({ role: 'assistant', text: r.reply });
    } catch (e) { if (valid()) setError(e); } finally { if (valid()) setBusy(false); }
  }

  // A question handed over from elsewhere in the app (e.g. "Ask the assistant").
  useEffect(() => {
    if (panelOpen && pendingQuestion) send(takePending());
  }, [panelOpen, pendingQuestion]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (panelOpen) setTimeout(() => inputRef.current?.focus(), 50); }, [panelOpen]);
  useEffect(() => { listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' }); }, [messages.length, busy]);
  useEffect(() => {
    if (!panelOpen) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') closePanel(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [panelOpen, closePanel]);

  if (!ai.on('chat') || !panelOpen) return null;

  const suggestions = page === 'New referral form'
    ? [t('ai.q.stabilise'), t('ai.q.dangerSigns'), t('ai.q.howRoute')]
    : page.startsWith('Consultation') || page === 'New consultation'
      ? [t('ai.q.howConsult'), t('ai.q.writeOpinion'), t('ai.q.dangerSigns')]
      : [t('ai.q.howRefer'), t('ai.q.dangerSigns'), t('ai.q.stabilise')];

  return (
    <aside
      role="complementary" aria-label={t('ai.assistant')}
      className="fixed inset-0 z-50 flex flex-col bg-white animate-erl-fade
                 lg:inset-y-0 lg:left-auto lg:right-0 lg:top-0 lg:z-40 lg:w-[400px] lg:border-l lg:border-slate-200 lg:shadow-erl-lg"
    >
      <header className="flex items-center gap-3 border-b border-slate-200 bg-gradient-to-r from-violet-50 to-brand-50 px-4 py-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-brand-700 text-white">
          <Icon name="sparkle" className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-slate-900">{t('ai.assistant')}</p>
          <p className="truncate text-[11px] text-slate-500">{t('ai.onPage', { page })}</p>
        </div>
        {messages.length > 0 && (
          <button type="button" onClick={() => { clear(); setError(null); }} className="rounded-lg px-2 py-1 text-xs font-semibold text-slate-500 hover:bg-white hover:text-slate-800">
            {t('ai.newChat')}
          </button>
        )}
        <button type="button" onClick={closePanel} aria-label={t('ai.close')}
                className="rounded-lg p-1.5 text-slate-500 hover:bg-white hover:text-slate-800">
          <Icon name="x" className="h-5 w-5" />
        </button>
      </header>

      <div ref={listRef} className="erl-scroll flex-1 space-y-4 overflow-y-auto px-4 py-4" aria-live="polite">
        {messages.length === 0 && (
          <div className="space-y-4 pt-2">
            <div className="rounded-2xl bg-slate-50 p-4 text-sm leading-relaxed text-slate-600 ring-1 ring-slate-200/80">
              <p className="font-semibold text-slate-800">{t('ai.hello')}</p>
              <p className="mt-1">{t('ai.intro')}</p>
            </div>
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-400">{t('ai.try')}</p>
              {suggestions.map((s) => (
                <button key={s} type="button" onClick={() => send(s)}
                        className="block w-full rounded-xl bg-white px-3.5 py-2.5 text-left text-sm font-medium text-violet-800 ring-1 ring-violet-200 transition hover:bg-violet-50">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          m.role === 'user' ? (
            <div key={i} className="flex justify-end">
              <p className="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-br-md bg-brand-600 px-3.5 py-2.5 text-sm text-white">{m.text}</p>
            </div>
          ) : (
            <div key={i} className="flex gap-2.5">
              <span aria-hidden className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-700">
                <Icon name="sparkle" className="h-4 w-4" />
              </span>
              <div className="min-w-0 max-w-[88%] rounded-2xl rounded-tl-md bg-slate-50 px-3.5 py-2.5 text-sm text-slate-700 ring-1 ring-slate-200/80">
                <AiText text={m.text} />
              </div>
            </div>
          )
        ))}
        {busy && (
          <div className="flex items-center gap-2.5 text-sm text-slate-500" role="status">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-100 text-violet-700">
              <Icon name="loader" className="h-4 w-4 animate-spin" />
            </span>
            {t('ai.thinking')}
          </div>
        )}
        <AiError error={error} />
      </div>

      <form onSubmit={(e) => { e.preventDefault(); send(); }} className="border-t border-slate-200 bg-white p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        <div className="flex items-end gap-2 rounded-2xl bg-slate-50 p-1.5 ring-1 ring-slate-200 focus-within:ring-2 focus-within:ring-violet-400">
          <textarea
            ref={inputRef} rows={1} value={text} maxLength={2000}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder={t('ai.placeholder')} aria-label={t('ai.placeholder')}
            className="max-h-32 min-h-[40px] flex-1 resize-none border-0 bg-transparent px-2 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
          />
          <button type="submit" disabled={busy || !text.trim()} aria-label={t('ai.send')}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-white transition hover:bg-violet-700 disabled:bg-slate-300">
            <Icon name="send" className="h-4.5 w-4.5" />
          </button>
        </div>
        <p className="mt-1.5 px-1 text-[11px] leading-snug text-slate-400">{t('ai.footer')}</p>
      </form>
    </aside>
  );
}
