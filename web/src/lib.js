import { create } from 'zustand';
import { demoApi } from './demo/api';

/* ------------------------------------------------------------------ API */
const BASE = import.meta.env.VITE_API_BASE || '';
/** No API base configured -> run fully in the browser (static Vercel demo).
 *  Point VITE_API_BASE at the NestJS server and this layer disappears. */
export const DEMO_MODE = !BASE;

export class ApiError extends Error {
  constructor(status, body) {
    super(typeof body?.message === 'string' ? body.message : 'Request failed');
    this.status = status;
    this.body = body;
    // Business-rule violations come back as structured objects, not strings —
    // surface them so the clinician sees *which* rule and *what to do*.
    this.detail = typeof body?.message === 'object' ? body.message : body;
  }
}

export async function api(method, path, body) {
  if (DEMO_MODE) {
    try {
      // small latency so spinners/optimistic states behave like production
      await new Promise((r) => setTimeout(r, 120 + Math.random() * 180));
      return await demoApi(method, path, body);
    } catch (e) {
      if (e.demoStatus === 401) {
        localStorage.removeItem('erl_token');
        localStorage.removeItem('erl_user');
      }
      throw new ApiError(e.demoStatus || 500, e.demoBody || { message: e.message });
    }
  }
  const token = localStorage.getItem('erl_token');
  const res = await fetch(BASE + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try { json = await res.json(); } catch { /* empty body */ }
  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('erl_token');
      localStorage.removeItem('erl_user');
    }
    throw new ApiError(res.status, json);
  }
  return json;
}

export const get  = (p) => api('GET', p);
export const post = (p, b) => api('POST', p, b);
export const put  = (p, b) => api('PUT', p, b);

/* ----------------------------------------------------------------- AUTH */
export const useAuth = create((set) => ({
  user: JSON.parse(localStorage.getItem('erl_user') || 'null'),
  token: localStorage.getItem('erl_token'),

  async login(username, password) {
    const r = await post('/v1/auth/login', { username, password });
    localStorage.setItem('erl_token', r.accessToken);
    localStorage.setItem('erl_user', JSON.stringify(r.user));
    set({ user: r.user, token: r.accessToken });
    return r.user;
  },

  logout() {
    localStorage.removeItem('erl_token');
    localStorage.removeItem('erl_user');
    set({ user: null, token: null });
  },
}));

/* ------------------------------------------------------- DOMAIN HELPERS */

export const URGENCY_STYLE = {
  emergency: 'bg-red-100 text-red-800 ring-red-600/30',
  urgent:    'bg-amber-100 text-amber-900 ring-amber-600/30',
  routine:   'bg-slate-100 text-slate-700 ring-slate-500/30',
};

/** Status groups drive colour. Never colour alone — always paired with text (NFR-USA-07). */
export function statusStyle(status) {
  if (status === 'CLOSED_COMPLETED') return 'bg-emerald-100 text-emerald-800 ring-emerald-600/30';
  if (status?.startsWith('CLOSED_')) return 'bg-slate-200 text-slate-700 ring-slate-500/30';
  if (['DECLINED', 'NOT_ARRIVED', 'ESCALATED', 'ACCEPTED_LAPSED'].includes(status))
    return 'bg-red-100 text-red-800 ring-red-600/30';
  if (['ACCEPTED', 'ARRIVED', 'IN_CARE', 'OUTCOME_RETURNED'].includes(status))
    return 'bg-brand-100 text-brand-700 ring-brand-600/30';
  return 'bg-blue-100 text-blue-800 ring-blue-600/30';
}

export const humanStatus = (s) =>
  (s || '').replace(/^CLOSED_/, 'Closed: ').replace(/_/g, ' ').toLowerCase()
    .replace(/^./, (c) => c.toUpperCase());

export const humanCode = (s) =>
  (s || '').replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());

export function slaLabel(mins) {
  if (mins === null || mins === undefined) return null;
  if (mins < 0) return { text: `Overdue by ${Math.abs(mins)} min`, tone: 'text-red-700 font-semibold' };
  if (mins < 10) return { text: `${mins} min left`, tone: 'text-amber-700 font-semibold' };
  return { text: `${mins} min left`, tone: 'text-slate-600' };
}

export function timeAgo(ts) {
  if (!ts) return '—';
  const mins = Math.round((Date.now() - new Date(ts).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const h = Math.round(mins / 60);
  if (h < 24) return `${h} h ago`;
  return `${Math.round(h / 24)} d ago`;
}

/**
 * Ethiopian calendar display (NFR-USA-02).
 * Civil approximation: adequate for display alongside Gregorian; a production
 * build should use a vetted conversion library.
 */
export function toEthiopian(date) {
  const d = new Date(date);
  const gy = d.getFullYear(), gm = d.getMonth() + 1, gd = d.getDate();
  const newYear = new Date(gy, 8, isLeapGregorian(gy + 1) ? 12 : 11); // ~11/12 Sept
  let ey, startOfYear;
  if (d >= newYear) { ey = gy - 7; startOfYear = newYear; }
  else { ey = gy - 8; startOfYear = new Date(gy - 1, 8, isLeapGregorian(gy) ? 12 : 11); }
  const days = Math.floor((d - startOfYear) / 86400000);
  const em = Math.floor(days / 30) + 1;
  const ed = (days % 30) + 1;
  const names = ['Meskerem','Tikimt','Hidar','Tahsas','Tir','Yekatit','Megabit',
                 'Miazia','Ginbot','Sene','Hamle','Nehase','Pagume'];
  return `${ed} ${names[Math.min(em - 1, 12)]} ${ey}`;
}
const isLeapGregorian = (y) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;

export const formatDual = (ts) => {
  if (!ts) return '—';
  const d = new Date(ts);
  return `${d.toLocaleDateString('en-GB')} (${toEthiopian(d)})`;
};
