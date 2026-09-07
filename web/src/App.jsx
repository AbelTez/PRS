import React, { useState } from 'react';
import {
  BrowserRouter, Routes, Route, Navigate, NavLink, Link, useNavigate,
} from 'react-router-dom';
import { useAuth, humanCode, DEMO_MODE } from './lib';
import { Button, Card, Field, Input, ErrorBox } from './ui';
import NewReferral from './NewReferral';
import { ReferralList, ReferralDetail, Dashboard, AvailabilityAdmin } from './Pages';
import PatientPortal, { TrackReferral } from './PatientPortal';
import ITAdmin from './ITAdmin';

/* ================================================================ LANDING */
function Landing() {
  const user = useAuth((s) => s.user);
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <BrandMark />
          <nav className="flex items-center gap-2">
            <Link to="/track" className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">
              Track a referral
            </Link>
            {user
              ? <Link to={homeFor(user)}><Button>Open workspace</Button></Link>
              : <Link to="/login"><Button>Staff sign in</Button></Link>}
          </nav>
        </div>
      </header>

      {/* hero */}
      <section className="bg-gradient-to-b from-brand-700 to-brand-600 text-white">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-14 md:grid-cols-2 md:py-20">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-brand-100">
              የሪፈራል ትስስር · Referral Linkage
            </p>
            <h1 className="mt-2 text-4xl font-extrabold leading-tight md:text-5xl">
              Every referral tracked.<br />Every loop closed.
            </h1>
            <p className="mt-4 max-w-md text-brand-50">
              A closed-loop referral exchange for Ethiopian health facilities — from
              health post to specialised hospital. Capability-aware routing, real bed
              reservations, attached imaging, and a patient portal with feedback.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/login"><Button className="!bg-white !text-brand-700 hover:!bg-brand-50">Staff sign in</Button></Link>
              <Link to="/track"><Button variant="ghost" className="!bg-brand-500/40 !text-white !ring-brand-300">I am a patient</Button></Link>
            </div>
          </div>
          <div className="grid grid-cols-2 content-center gap-3">
            {[['21', 'lifecycle states, server-enforced'],
              ['5 min', 'emergency response SLA'],
              ['18', 'facilities in the pilot network'],
              ['★', 'patient ratings close the quality loop']].map(([v, l]) => (
              <div key={l} className="rounded-2xl bg-white/10 p-4 backdrop-blur">
                <p className="text-3xl font-bold">{v}</p>
                <p className="mt-1 text-sm text-brand-50">{l}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* the flow */}
      <section className="mx-auto max-w-6xl px-4 py-14">
        <h2 className="text-2xl font-bold text-slate-900">How a referral moves</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-4">
          {[
            ['1 · Refer', 'A doctor or health extension worker registers the patient, records vitals and attaches X-ray / MRI / lab PDFs.'],
            ['2 · Route', 'The engine ranks capable facilities by capability, distance, free beds, acceptance history and patient ratings — and shows why others are excluded.'],
            ['3 · Receive', 'The receiving liaison accepts with a real bed reservation; the doctor sees the full clinical picture and the sender’s identity and address.'],
            ['4 · Close', 'Arrival is confirmed, the outcome returns to the sender, and the patient rates both facilities.'],
          ].map(([t, d]) => (
            <div key={t} className="rounded-2xl bg-slate-50 p-5 ring-1 ring-slate-200">
              <p className="font-bold text-brand-700">{t}</p>
              <p className="mt-2 text-sm text-slate-600">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* audiences */}
      <section className="bg-slate-50 py-14">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-2xl font-bold text-slate-900">Built for every role in the chain</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              ['🩺', 'Doctors & health officers', 'Guided referral wizard, mandatory vitals, stabilisation checklists, imaging attachments.'],
              ['🛎️', 'Referral liaisons', 'One inbound queue with SLA timers, accept/decline with reasons, live bed board.'],
              ['🖥️', 'Hospital IT administrators', 'Register and verify staff — only verified staff of a facility can act in its name.'],
              ['🧑‍🦱', 'Patients', 'Track your referral like a parcel, read follow-up instructions, rate both hospitals.'],
              ['🏛️', 'Woreda & regional health bureaus', 'Loop-closure rate, decline reasons, override analytics — flow, not private charts.'],
              ['🚑', 'Triage & facility admins', 'Arrival confirmation by referral code, capability matrix kept honest.'],
            ].map(([icon, t, d]) => (
              <div key={t} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
                <p className="text-2xl" aria-hidden>{icon}</p>
                <p className="mt-2 font-semibold text-slate-900">{t}</p>
                <p className="mt-1 text-sm text-slate-600">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-6 text-xs text-slate-500 sm:flex-row">
          <span>Ethio Referral Linkage — pilot demonstration build. Synthetic data only; no real patient records.</span>
          <span>Scope: Ethiopian public health facilities (FMOH three-tier system)</span>
        </div>
      </footer>
    </div>
  );
}

function BrandMark({ light }) {
  return (
    <Link to="/" className="flex items-center gap-2">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-lg font-black text-white">
        ER
      </span>
      <span className="leading-tight">
        <span className={`block font-bold ${light ? 'text-white' : 'text-brand-700'}`}>Ethio Referral Linkage</span>
        <span className={`block text-[11px] ${light ? 'text-brand-100' : 'text-slate-500'}`}>የሪፈራል ትስስር · Federal three-tier network</span>
      </span>
    </Link>
  );
}

/* ================================================================== LOGIN */
const DEMO_ACCOUNTS = [
  { group: 'Doctors', rows: [
    ['dr.abdi', 'Dr Abdi Gemechu — Medical Director, Ambo General'],
    ['dr.samuel', 'Dr Samuel Worku — Internist, Zewditu Memorial'],
    ['dr.tigist', 'Dr Tigist Alemu — OB/GYN, Black Lion'],
    ['dr.selam', 'Dr Selam Fikre — GP, Addis Ketema Health Centre'],
  ]},
  { group: 'Liaisons (receiving desk)', rows: [
    ['liaison.ambo', 'Sr Hanna Girma — Ambo General Hospital'],
    ['liaison.blacklion', 'Sr Selamawit Bekele — Black Lion'],
    ['liaison.y12', 'Sr Marta Gebre — Yekatit 12'],
  ]},
  { group: 'IT administrators', rows: [
    ['it.blacklion', 'Natnael Tesfaye — Black Lion ICT'],
    ['it.ambo', 'Kalkidan Mengistu — Ambo General ICT'],
    ['it.stpauls', "Eyob Alemayehu — St. Paul's ICT"],
  ]},
  { group: 'Patients', rows: [
    ['abeba.k', 'Abeba Kassahun — pre-eclampsia referral'],
    ['roba.d', 'Roba Dinsa — trauma referral'],
  ]},
  { group: 'Community & oversight', rows: [
    ['hew.awaro', 'Almaz Bekele — Health Extension Worker, Awaro'],
    ['clin.ambohc', 'Dr Kebede Tesfaye — Ambo Health Centre'],
    ['woreda.ws', 'W/ro Sara Negash — West Shewa Zonal Health Dept'],
  ]},
];

function homeFor(user) {
  if (!user) return '/login';
  if (user.role === 'patient') return '/portal';
  if (user.role === 'it_admin') return '/it';
  return '/referrals';
}

function Login() {
  const login = useAuth((s) => s.login);
  const nav = useNavigate();
  const [username, setUsername] = useState('dr.abdi');
  const [password, setPassword] = useState('Password123!');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e?.preventDefault();
    setBusy(true); setError(null);
    try { const u = await login(username, password); nav(homeFor(u)); }
    catch (err2) { setError(err2); } finally { setBusy(false); }
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="bg-brand-700 py-4"><div className="mx-auto max-w-5xl px-4"><BrandMark light /></div></div>
      <div className="mx-auto grid max-w-5xl gap-6 p-4 py-8 md:grid-cols-[minmax(0,380px)_1fr]">
        <div className="space-y-4">
          <Card title="Staff & patient sign in" subtitle="Accounts are issued and verified by each facility's IT administrator">
            <form onSubmit={submit} className="space-y-3">
              <Field label="Username"><Input value={username} onChange={(e) => setUsername(e.target.value)} autoCapitalize="none" /></Field>
              <Field label="Password"><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
              <ErrorBox error={error} />
              <Button type="submit" className="w-full" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</Button>
            </form>
            <p className="mt-3 text-xs text-slate-500">
              Patient without an account? <Link to="/track" className="font-medium text-brand-600">Track your referral</Link> with
              your referral code and phone number.
            </p>
          </Card>
          <p className={`rounded-lg p-3 text-xs ring-1 ${DEMO_MODE
            ? 'bg-amber-50 text-amber-900 ring-amber-200' : 'bg-slate-50 text-slate-600 ring-slate-200'}`}>
            {DEMO_MODE
              ? 'Showcase build — runs entirely in your browser with synthetic data. '
              : 'Connected to the Ethio Referral Linkage API with the pilot database. '}
            Demo accounts use <span className="font-mono font-semibold">Password123!</span>
          </p>
        </div>
        <Card title="Demo accounts" subtitle="Tap to fill the username">
          <div className="grid gap-4 sm:grid-cols-2">
            {DEMO_ACCOUNTS.map(({ group, rows }) => (
              <div key={group}>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{group}</p>
                <div className="space-y-1">
                  {rows.map(([u, label]) => (
                    <button key={u} onClick={() => setUsername(u)}
                            className={`block w-full rounded-lg px-3 py-2 text-left text-sm ring-1 ring-transparent hover:bg-brand-50
                              ${username === u ? 'bg-brand-50 ring-brand-200' : ''}`}>
                      <span className="font-mono text-xs text-brand-600">{u}</span>
                      <span className="block text-xs text-slate-600">{label}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Try <span className="font-mono">dr.yonas</span> — a Black Lion doctor whose account is still
            <span className="font-medium"> awaiting IT verification</span>; sign in as <span className="font-mono">it.blacklion</span> to verify him.
          </p>
        </Card>
      </div>
    </div>
  );
}

/* ================================================================== SHELL */
function Shell({ children }) {
  const { user, logout } = useAuth();
  const nav = useNavigate();

  const links = user?.role === 'patient'
    ? [['/portal', 'My referrals']]
    : user?.role === 'it_admin'
      ? [['/it', 'Staff accounts'], ['/availability', 'Availability'], ['/dashboard', 'Dashboard']]
      : [
        ['/referrals', 'Referrals'],
        ['/dashboard', 'Dashboard'],
        ...(['facility_admin', 'liaison', 'triage'].includes(user?.role) ? [['/availability', 'Availability']] : []),
      ];

  return (
    <div className="min-h-screen pb-20 sm:pb-0">
      <header className="sticky top-0 z-40 border-b border-brand-800/40 bg-brand-700 text-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-2.5">
          <div className="flex min-w-0 items-center gap-3">
            <BrandMark light />
          </div>
          <nav className="hidden gap-1 sm:flex">
            {links.map(([to, label]) => (
              <NavLink key={to} to={to} className={({ isActive }) =>
                `rounded-lg px-3 py-2 text-sm font-medium ${isActive ? 'bg-white/15 text-white' : 'text-brand-100 hover:bg-white/10'}`}>
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <div className="hidden text-right sm:block">
              <p className="max-w-[180px] truncate text-sm font-medium">{user?.fullName}</p>
              <p className="max-w-[180px] truncate text-[11px] text-brand-100">
                {humanCode(user?.role)}{user?.facilityName ? ` · ${user.facilityName}` : ''}
              </p>
            </div>
            <Button variant="ghost" className="!bg-white/10 !text-white !ring-white/20 hover:!bg-white/20"
                    onClick={() => { logout(); nav('/'); }}>
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <main>{children}</main>

      {/* mobile bottom nav — thumb reach on a low-end phone */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-slate-200 bg-white sm:hidden">
        {links.map(([to, label]) => (
          <NavLink key={to} to={to} className={({ isActive }) =>
            `flex-1 py-3 text-center text-sm font-medium ${isActive ? 'text-brand-700' : 'text-slate-500'}`}>
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

function Protected({ roles, children }) {
  const user = useAuth((s) => s.user);
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to={homeFor(user)} replace />;
  return <Shell>{children}</Shell>;
}

const STAFF = ['hew', 'doctor', 'clinician', 'specialist', 'liaison', 'triage', 'facility_admin', 'it_admin', 'woreda', 'region', 'moh', 'cbhi', 'sysadmin'];

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/track" element={<TrackReferral />} />
        <Route path="/portal" element={<Protected roles={['patient']}><PatientPortal /></Protected>} />
        <Route path="/referrals" element={<Protected roles={STAFF}><ReferralList /></Protected>} />
        <Route path="/referrals/:id" element={<Protected><ReferralDetail /></Protected>} />
        <Route path="/new" element={<Protected roles={STAFF}><NewReferral /></Protected>} />
        <Route path="/dashboard" element={<Protected roles={STAFF}><Dashboard /></Protected>} />
        <Route path="/availability" element={<Protected roles={STAFF}><AvailabilityAdmin /></Protected>} />
        <Route path="/it" element={<Protected roles={['it_admin', 'facility_admin', 'sysadmin']}><ITAdmin /></Protected>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
