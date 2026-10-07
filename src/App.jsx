import React, { useState } from 'react';
import {
  BrowserRouter, Routes, Route, Navigate, NavLink, Link, useNavigate,
} from 'react-router-dom';
import { useAuth, humanCode, DEMO_MODE } from './lib';
import { Button, Card, Field, Input, ErrorBox, Notice } from './ui';
import { BrandLockup, LogoMark, ConnectionField, FlowSteps, IconTile, Photo } from './brand';
import NewReferral from './NewReferral';
import { ReferralList, ReferralDetail, Dashboard, AvailabilityAdmin } from './Pages';
import PatientPortal, { TrackReferral } from './PatientPortal';
import ITAdmin from './ITAdmin';

/* ================================================================ LANDING */
function Landing() {
  const user = useAuth((s) => s.user);
  return (
    <div className="flex min-h-screen flex-col bg-slate-100">
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <BrandMark />
          <nav className="flex items-center gap-1.5">
            <Link
              to="/track"
              className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-brand-50 hover:text-brand-700"
            >
              Track a referral
            </Link>
            {user
              ? <Link to={homeFor(user)}><Button>Open workspace</Button></Link>
              : <Link to="/login"><Button>Staff sign in</Button></Link>}
          </nav>
        </div>
      </header>

      {/* hero */}
      <section className="relative isolate overflow-hidden bg-gradient-to-br from-brand-800 via-brand-700 to-brand-600 text-white">
        <div aria-hidden="true" className="erl-grid absolute inset-0 opacity-70" />
        <div aria-hidden="true" className="absolute inset-0 opacity-40">
          <ConnectionField className="h-full w-full" nodes={9} seed={3} />
        </div>
        <div
          aria-hidden="true"
          className="absolute -right-24 top-10 hidden h-[30rem] w-[30rem] overflow-hidden rounded-[2rem] ring-1 ring-white/20 lg:block"
        >
          <Photo
            src="/img/ethiopian-healthcare-team.jpg"
            alt="Ethiopian doctors and nurses working together in a hospital"
            priority
            className="h-full w-full"
          />
          <span className="absolute inset-0 bg-gradient-to-r from-brand-700 via-brand-700/40 to-transparent" />
        </div>

        <div className="relative mx-auto grid max-w-6xl gap-10 px-4 py-16 md:py-24 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="max-w-2xl">
            <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-brand-100 ring-1 ring-white/20">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-300" aria-hidden />
              የሪፈራል ትስስር · Referral Linkage
            </p>
            <h1 className="mt-5 text-4xl font-bold leading-[1.08] tracking-[-0.035em] text-white sm:text-5xl md:text-[3.4rem]">
              Every referral tracked.<br />Every loop closed.
            </h1>
            <p className="mt-5 max-w-lg text-base leading-relaxed text-brand-50">
              A closed-loop referral exchange for Ethiopian health facilities — from
              health post to specialised hospital. Capability-aware routing, real bed
              reservations, attached imaging, and a patient portal with feedback.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/login">
                <Button className="!bg-white !text-brand-800 !ring-brand-300 hover:!bg-brand-50">
                  Staff sign in
                </Button>
              </Link>
              <Link to="/track">
                <Button
                  variant="ghost"
                  className="!bg-white/10 !text-white !ring-white/30 hover:!bg-white/20"
                >
                  I am a patient — track my referral
                </Button>
              </Link>
            </div>

            <div className="mt-10 grid grid-cols-2 gap-3 sm:max-w-lg sm:grid-cols-4 lg:max-w-2xl">
              {[['21', 'lifecycle states, server-enforced'],
                ['5 min', 'emergency response SLA'],
                ['18', 'facilities in the pilot network'],
                ['★', 'patient ratings close the quality loop']].map(([v, l]) => (
                <div
                  key={l}
                  className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/20 backdrop-blur-sm transition hover:bg-white/15"
                >
                  <p className="text-2xl font-bold tracking-[-0.03em] text-white sm:text-3xl">{v}</p>
                  <p className="mt-1.5 text-[13px] leading-snug text-brand-50">{l}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* the flow */}
      <section className="mx-auto w-full max-w-6xl px-4 py-16">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-600">
              The referral lifecycle
            </p>
            <h2 className="mt-1.5 text-2xl font-semibold tracking-[-0.025em] text-slate-900 sm:text-3xl">
              How a referral moves
            </h2>
          </div>
        </div>
        <FlowSteps
          className="mt-8"
          steps={[
            ['Refer', 'A doctor or health extension worker registers the patient, records vitals and attaches X-ray / MRI / lab PDFs.'],
            ['Route', 'The engine ranks capable facilities by capability, distance, free beds, acceptance history and patient ratings — and shows why others are excluded.'],
            ['Receive', 'The receiving liaison accepts with a real bed reservation; the doctor sees the full clinical picture and the sender’s identity and address.'],
            ['Close', 'Arrival is confirmed, the outcome returns to the sender, and the patient rates both facilities.'],
          ]}
        />
      </section>

      {/* audiences */}
      <section className="border-y border-slate-200/80 bg-white py-16">
        <div className="mx-auto max-w-6xl px-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-600">
            One platform, every role
          </p>
          <h2 className="mt-1.5 text-2xl font-semibold tracking-[-0.025em] text-slate-900 sm:text-3xl">
            Built for every role in the chain
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              ['stethoscope', 'Doctors & health officers', 'Guided referral wizard, mandatory vitals, stabilisation checklists, imaging attachments.'],
              ['inbox', 'Referral liaisons', 'One inbound queue with SLA timers, accept/decline with reasons, live bed board.'],
              ['monitor', 'Hospital IT administrators', 'Register and verify staff — only verified staff of a facility can act in its name.'],
              ['people', 'Patients', 'Track your referral like a parcel, read follow-up instructions, rate both hospitals.'],
              ['bureau', 'Woreda & regional health bureaus', 'Loop-closure rate, decline reasons, override analytics — flow, not private charts.'],
              ['ambulance', 'Triage & facility admins', 'Arrival confirmation by referral code, capability matrix kept honest.'],
            ].map(([icon, t, d]) => (
              <div
                key={t}
                className="group rounded-2xl bg-white p-5 shadow-erl-sm ring-1 ring-brand-200/60 transition hover:-translate-y-0.5 hover:shadow-erl-md hover:ring-brand-300"
              >
                <IconTile name={icon} />
                <p className="mt-4 font-semibold tracking-[-0.015em] text-slate-900">{t}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="mt-auto border-t border-slate-200/80 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-xs text-slate-500 sm:flex-row">
          <div className="flex items-center gap-3">
            <LogoMark className="h-8 w-8" rounded="rounded-lg" />
            <span className="font-semibold text-slate-700">Ethio Referral Linkage</span>
          </div>
          <span className="text-center sm:text-right">
            Ethio Referral Linkage — pilot demonstration build. Synthetic data only; no real patient records.
          </span>
          <span className="sm:text-right">Scope: Ethiopian public health facilities (FMOH three-tier system)</span>
        </div>
      </footer>
    </div>
  );
}

function BrandMark({ light }) {
  return (
    <Link to="/" className="group inline-flex shrink-0 items-center">
      {/* BrandLockup draws the mark itself, so no second LogoMark here. */}
      <BrandLockup
        tone={light ? 'light' : 'dark'}
        markClass="h-10 w-10 transition group-hover:shadow-erl-sm"
        className="hidden sm:flex"
      />
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
      {/* brand band */}
      <div className="relative isolate overflow-hidden bg-gradient-to-br from-brand-800 via-brand-700 to-brand-600">
        <div aria-hidden="true" className="erl-grid absolute inset-0 opacity-70" />
        <div aria-hidden="true" className="absolute inset-0 opacity-40">
          <ConnectionField className="h-full w-full" nodes={6} seed={5} />
        </div>
        <div className="relative mx-auto max-w-6xl px-4 py-5">
          <BrandMark light />
        </div>
      </div>

      <div className="mx-auto grid max-w-6xl gap-6 p-4 py-8 lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)] lg:py-12">
        <div className="space-y-4">
          <Card title="Staff & patient sign in" subtitle="Accounts are issued and verified by each facility's IT administrator">
            <form onSubmit={submit} className="space-y-4">
              <Field label="Username"><Input value={username} onChange={(e) => setUsername(e.target.value)} autoCapitalize="none" /></Field>
              <Field label="Password"><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
              <ErrorBox error={error} />
              <Button type="submit" className="w-full" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</Button>
            </form>
            <p className="mt-4 border-t border-slate-200 pt-3.5 text-xs leading-relaxed text-slate-500">
              Patient without an account?{' '}
              <Link to="/track" className="font-semibold text-brand-600 hover:text-brand-700">Track your referral</Link>{' '}
              with your referral code and phone number.
            </p>
          </Card>
          <Notice tone={DEMO_MODE ? 'warn' : 'brand'}>
            {DEMO_MODE
              ? 'Showcase build — runs entirely in your browser with synthetic data. '
              : 'Connected to the Ethio Referral Linkage API with the pilot database. '}
            Demo accounts use <span className="font-mono font-semibold">Password123!</span>
          </Notice>
        </div>

        <div className="space-y-6">
          <Card title="Demo accounts" subtitle="Tap to fill the username">
            <div className="grid gap-5 sm:grid-cols-2">
              {DEMO_ACCOUNTS.map(({ group, rows }) => (
                <div key={group}>
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">{group}</p>
                  <div className="space-y-1">
                    {rows.map(([u, label]) => (
                      <button
                        key={u} onClick={() => setUsername(u)}
                        className={`block w-full rounded-xl px-3 py-2.5 text-left text-sm ring-1 transition
                          ${username === u
                            ? 'bg-brand-50 ring-brand-300'
                            : 'ring-transparent hover:bg-slate-50 hover:ring-slate-200'}`}
                      >
                        <span className={`font-mono text-xs font-semibold ${username === u ? 'text-brand-700' : 'text-brand-600'}`}>
                          {u}
                        </span>
                        <span className="mt-0.5 block text-xs leading-relaxed text-slate-600">{label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-4 border-t border-slate-200 pt-3.5 text-xs leading-relaxed text-slate-500">
              Try <span className="font-mono">dr.yonas</span> — a Black Lion doctor whose account is still
              <span className="font-semibold text-slate-600"> awaiting IT verification</span>; sign in as{' '}
              <span className="font-mono">it.blacklion</span> to verify him.
            </p>
          </Card>

          <div className="flex items-center gap-4 rounded-2xl bg-white p-4 shadow-erl-sm ring-1 ring-brand-200/60">
            <Photo
              src="/img/ethiopian-healthcare-team.jpg"
              alt="Ethiopian doctors and nurses working together in a hospital"
              className="h-20 w-24 shrink-0 rounded-xl"
              imgClassName="h-20 w-24"
            />
            <p className="text-sm leading-relaxed text-slate-600">
              Built with Ethiopian health facilities in mind — three-tier routing, low-bandwidth
              operation, and interfaces that stay readable in daylight.
            </p>
          </div>
        </div>
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
    <div className="min-h-screen bg-slate-100 pb-20 sm:pb-0">
      <header className="sticky top-0 z-40 border-b border-brand-900/30 bg-gradient-to-r from-brand-800 to-brand-600 text-white shadow-erl-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2.5">
          <div className="flex min-w-0 items-center gap-3">
            <BrandMark light />
          </div>
          <nav className="hidden gap-1 sm:flex">
            {links.map(([to, label]) => (
              <NavLink
                key={to} to={to}
                className={({ isActive }) =>
                  `relative rounded-xl px-3.5 py-2 text-sm font-semibold transition ${
                    isActive
                      ? 'bg-white/15 text-white ring-1 ring-white/25'
                      : 'text-brand-100 hover:bg-white/10 hover:text-white'
                  }`}
              >
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <div className="hidden text-right sm:block">
              <p className="max-w-[190px] truncate text-sm font-semibold">{user?.fullName}</p>
              <p className="max-w-[190px] truncate text-[11px] text-brand-100">
                {humanCode(user?.role)}{user?.facilityName ? ` · ${user.facilityName}` : ''}
              </p>
            </div>
            <Button
              variant="ghost"
              className="!bg-white/10 !text-white !ring-white/25 hover:!bg-white/20"
              onClick={() => { logout(); nav('/'); }}
            >
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="erl-aurora">{children}</main>

      {/* mobile bottom nav — thumb reach on a low-end phone */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-brand-200 bg-white/95 backdrop-blur sm:hidden">
        {links.map(([to, label]) => (
          <NavLink
            key={to} to={to}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-1 py-2.5 text-[12px] font-semibold transition ${
                isActive ? 'text-brand-700' : 'text-slate-500'
              }`}
          >
            {({ isActive }) => (
              <>
                <span
                  aria-hidden
                  className={`h-1 w-8 rounded-full transition ${isActive ? 'bg-brand-500' : 'bg-transparent'}`}
                />
                {label}
              </>
            )}
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
