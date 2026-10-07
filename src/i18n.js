import { useCallback } from 'react';
import { create } from 'zustand';
import en from './locales/en';
import am from './locales/am';
import { humanStatus, humanCode } from './lib';

/* ============================================================================
   I18N — English / Amharic
   ----------------------------------------------------------------------------
   No library: a flat key → string dictionary per language. Amharic falls back
   to English key by key, so screens can be translated incrementally. Clinical
   codes, drug names and referral codes are never translated.

     const t = useT();
     t('home.greeting', { name: 'Abdi' })     // "{name}" interpolation
     t('list.count', { count: 3 })            // picks list.count_one when count === 1
   ========================================================================== */

const DICTS = { en, am };
export const LANGUAGES = [
  { code: 'en', label: 'English', short: 'EN' },
  { code: 'am', label: 'አማርኛ', short: 'አማ' },
];

function readLang() {
  try {
    const v = localStorage.getItem('erl_lang');
    return DICTS[v] ? v : 'en';
  } catch { return 'en'; }
}

function applyLang(lang) {
  if (typeof document !== 'undefined') document.documentElement.lang = lang;
}

export const useLang = create((set) => ({
  lang: readLang(),
  setLang(lang) {
    if (!DICTS[lang]) return;
    try { localStorage.setItem('erl_lang', lang); } catch { /* private mode */ }
    applyLang(lang);
    set({ lang });
  },
}));
applyLang(useLang.getState().lang);

export function translate(lang, key, vars) {
  let k = key;
  if (vars && typeof vars.count === 'number' && vars.count === 1) {
    if (DICTS[lang]?.[`${key}_one`] !== undefined || en[`${key}_one`] !== undefined) k = `${key}_one`;
  }
  let s = DICTS[lang]?.[k];
  if (s === undefined) s = en[k];
  if (s === undefined) return key;
  if (vars) s = s.replace(/\{(\w+)\}/g, (_, v) => (vars[v] ?? `{${v}}`));
  return s;
}

/** React hook: a `t()` bound to the current language that re-renders on switch. */
export function useT() {
  const lang = useLang((s) => s.lang);
  return useCallback((key, vars) => translate(lang, key, vars), [lang]);
}

/** Status / urgency / code labels with a readable English fallback for unknown codes. */
export function useLabels() {
  const lang = useLang((s) => s.lang);
  return {
    status: (s) => (DICTS[lang]?.[`status.${s}`] ?? en[`status.${s}`] ?? humanStatus(s)),
    urgency: (u) => (DICTS[lang]?.[`urgency.${u}`] ?? en[`urgency.${u}`] ?? humanCode(u)),
    role: (r) => (DICTS[lang]?.[`role.${r}`] ?? en[`role.${r}`] ?? humanCode(r)),
    sex: (x) => (x ? translate(lang, `sex.${String(x).toLowerCase()}`) .replace(/^sex\./, '') : ''),
    /** "22 years" → "22 ዓመት" — the API sends value + English unit. */
    age: (a) => {
      if (!a) return '';
      const m = String(a).match(/^(\d+)\s*(\w+)$/);
      if (!m) return a;
      const k = `age.${m[2].toLowerCase()}`;
      const s = DICTS[lang]?.[k] ?? en[k];
      return s ? s.replace('{n}', m[1]) : a;
    },
    /** Relative time in the current language (mirrors lib.timeAgo). */
    ago: (ts) => {
      if (!ts) return '—';
      const mins = Math.round((Date.now() - new Date(ts).getTime()) / 60000);
      if (mins < 1) return translate(lang, 'time.now');
      if (mins < 60) return translate(lang, 'time.min', { n: mins });
      const h = Math.round(mins / 60);
      if (h < 24) return translate(lang, 'time.hour', { n: h });
      return translate(lang, 'time.day', { n: Math.round(h / 24) });
    },
  };
}
