import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth, DEMO_MODE } from './lib';
import { useT, useLang, useLabels, LANGUAGES } from './i18n';
import { Avatar, Badge, DropdownMenu, Sheet, Toaster, UrgencyBadge } from './ui';
import { Icon, LogoMark } from './brand';
import { useWorkload, useWorkloadPolling, summarize } from './workspace';
import { SENDER_ROLES, RECEPTION_ROLES, OVERSIGHT_ROLES, matchesQuery, compareByPriority } from './referrals';
import { ConsultationAlerts, CONSULTATION_ROLES } from './consultations/Consultations';

/* ============================================================================
   APP SHELL
   ----------------------------------------------------------------------------
   ≥1024px  collapsible sidebar (labels + live counts)
   768–1023 icon rail
   <768     top bar + bottom nav (3 items + More) + floating "New referral"
   Patients get a minimal top bar only.
   ========================================================================== */

/** Where each role starts after sign-in. */
export function homeFor(user) {
  if (!user) return '/login';
  if (user.role === 'patient') return '/portal';
  if (OVERSIGHT_ROLES.includes(user.role)) return '/dashboard';
  return '/home';
}

function useNavItems(user, s) {
  const t = useT();
  return useMemo(() => {
    if (!user) return [];
    const r = user.role;
    const home = { to: '/home', icon: 'home', label: t('nav.home'), badge: s.actions.length || null };
    const referrals = {
      to: '/referrals', icon: 'route', label: t('nav.referrals'),
      badge: RECEPTION_ROLES.includes(r) ? (s.unassigned.length || null) : null, badgeTone: 'ember',
    };
    const dashboard = { to: '/dashboard', icon: 'chart', label: t('nav.dashboard') };
    const availability = { to: '/availability', icon: 'bed', label: t('nav.availability') };
    const staff = { to: '/it', icon: 'userCheck', label: t('nav.staff'), badge: s.pendingUsers.length || null, badgeTone: 'ember' };
    const consults = {
      to: '/consultations', icon: 'message', label: t('nav.consultations'),
      badge: (s.invites.length + s.unreadConsults) || null,
    };
    const newRef = { to: '/new', icon: 'plus', label: t('nav.newReferral'), primary: true };

    if (SENDER_ROLES.includes(r)) {
      return [home, referrals, newRef,
        ...(CONSULTATION_ROLES.includes(r) && !DEMO_MODE ? [consults] : []), dashboard];
    }
    if (RECEPTION_ROLES.includes(r)) {
      return [home, referrals, availability, dashboard, ...(r === 'facility_admin' ? [staff] : [])];
    }
    if (r === 'it_admin') return [home, staff, availability, dashboard];
    if (OVERSIGHT_ROLES.includes(r)) return [dashboard, referrals, ...(r === 'sysadmin' ? [staff] : [])];
    return [home, referrals, dashboard];
  }, [user, s, t]);
}

function CountBadge({ n, tone = 'brand', className = '' }) {
  if (!n) return null;
  const c = tone === 'ember' ? 'bg-ember-400 text-ember-900' : 'bg-brand-300 text-brand-900';
  return (
    <span aria-hidden className={`erl-nums min-w-[1.25rem] rounded-full px-1.5 text-center text-[11px] font-bold leading-5 ${c} ${className}`}>
      {n > 99 ? '99+' : n}
    </span>
  );
}

/* ------------------------------------------------------------------ SIDEBAR */
function Sidebar({ items, collapsed, onToggle }) {
  const t = useT();
  const label = collapsed ? 'hidden' : 'hidden lg:inline';
  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 hidden flex-col bg-gradient-to-b from-brand-900 to-brand-800 text-white md:flex
                  md:w-[72px] ${collapsed ? '' : 'lg:w-64'} transition-[width] duration-200`}
      aria-label={t('nav.main')}
    >
      <Link to="/" className="flex h-16 shrink-0 items-center gap-2.5 px-4" aria-label="Ethio Referral Linkage">
        <LogoMark className="h-10 w-10" />
        <span className={`${label} min-w-0 leading-tight`}>
          <span className="block truncate text-[15px] font-semibold tracking-[-0.02em]">Ethio Referral</span>
          <span className="block truncate text-[11px] font-medium text-brand-200">የሪፈራል ትስስር</span>
        </span>
      </Link>

      <nav className="erl-scroll flex-1 space-y-1 overflow-y-auto px-3 py-3">
        {items.map((it) => (
          <NavLink
            key={it.to} to={it.to} end={it.to === '/referrals'}
            title={it.label}
            aria-describedby={it.badge ? `badge-side-${it.icon}` : undefined}
            className={({ isActive }) =>
              `group relative flex min-h-[44px] items-center gap-3 rounded-xl px-3 text-sm font-semibold transition
               ${it.primary
                ? 'bg-brand-500/25 text-white ring-1 ring-brand-300/40 hover:bg-brand-500/40'
                : isActive ? 'bg-white/12 text-white' : 'text-brand-100 hover:bg-white/8 hover:text-white'}`}
          >
            {({ isActive }) => (
              <>
                {isActive && !it.primary && <span aria-hidden className="absolute -left-3 top-2 bottom-2 w-1 rounded-r-full bg-brand-300" />}
                <span className="relative">
                  <Icon name={it.icon} className="h-5 w-5 shrink-0" />
                  {it.badge && <span aria-hidden className={`absolute -right-1.5 -top-1.5 h-2.5 w-2.5 rounded-full ring-2 ring-brand-900 ${collapsed ? '' : 'lg:hidden'} ${it.badgeTone === 'ember' ? 'bg-ember-400' : 'bg-brand-300'}`} />}
                </span>
                <span className={`${label} min-w-0 flex-1 truncate`}>{it.label}</span>
                <CountBadge n={it.badge} tone={it.badgeTone} className={label} />
                {/* count as a description, so the link's accessible name stays just its label */}
                {it.badge && <span id={`badge-side-${it.icon}`} hidden>{t('nav.count', { count: it.badge })}</span>}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <button
        type="button" onClick={onToggle}
        className="mx-3 mb-3 hidden min-h-[40px] items-center gap-3 rounded-xl px-3 text-xs font-semibold text-brand-200 transition hover:bg-white/8 hover:text-white lg:flex"
        aria-label={collapsed ? t('nav.expand') : t('nav.collapse')}
      >
        <Icon name="sidebar" className="h-5 w-5 shrink-0" />
        <span className={label}>{t('nav.collapse')}</span>
      </button>
    </aside>
  );
}

/* --------------------------------------------------------- LANGUAGE TOGGLE */
export function LanguageToggle({ tone = 'light', className = '' }) {
  const { lang, setLang } = useLang();
  const t = useT();
  return (
    <div role="group" aria-label={t('common.language')}
         className={`inline-flex rounded-xl p-0.5 ring-1 ${tone === 'light' ? 'bg-slate-100 ring-slate-200' : 'bg-white/10 ring-white/20'} ${className}`}>
      {LANGUAGES.map((l) => (
        <button
          key={l.code} type="button" onClick={() => setLang(l.code)} aria-pressed={lang === l.code}
          lang={l.code} title={l.label}
          className={`min-h-[32px] rounded-[10px] px-2.5 text-xs font-bold transition
            ${lang === l.code
              ? (tone === 'light' ? 'bg-white text-brand-700 shadow-erl-xs' : 'bg-white text-brand-800')
              : (tone === 'light' ? 'text-slate-500 hover:text-brand-700' : 'text-white/80 hover:text-white')}`}
        >
          {l.short}
        </button>
      ))}
    </div>
  );
}

/* ----------------------------------------------------------- GLOBAL SEARCH */
function GlobalSearch({ referrals, className = '', onDone }) {
  const t = useT();
  const nav = useNavigate();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);
  const ref = useRef(null);
  const box = useRef(null);

  // "/" focuses search from anywhere outside a text field.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== '/' || e.metaKey || e.ctrlKey) return;
      const tag = document.activeElement?.tagName;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag) || document.activeElement?.isContentEditable) return;
      e.preventDefault(); ref.current?.focus();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);
  useEffect(() => {
    const onDoc = (e) => { if (!box.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const matches = useMemo(() => (q.trim().length < 2 ? [] :
    (referrals || []).filter((r) => matchesQuery(r, q.trim())).sort(compareByPriority).slice(0, 6)), [q, referrals]);

  function go(path) { setOpen(false); setQ(''); onDone?.(); nav(path); }
  function onKeyDown(e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setHi((h) => Math.min(h + 1, matches.length)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHi((h) => Math.max(h - 1, 0)); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      if (matches[hi]) go(`/referrals/${matches[hi].id}`);
      else if (q.trim()) go(`/referrals?q=${encodeURIComponent(q.trim())}`);
    } else if (e.key === 'Escape') { setOpen(false); ref.current?.blur(); }
  }

  return (
    <div ref={box} className={`relative ${className}`}>
      <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400" />
      <input
        ref={ref} type="search" value={q} role="combobox" aria-expanded={open && q.length > 1}
        aria-controls="global-search-results" aria-label={t('search.label')}
        placeholder={t('search.placeholder')}
        onChange={(e) => { setQ(e.target.value); setOpen(true); setHi(0); }}
        onFocus={() => setOpen(true)} onKeyDown={onKeyDown}
        className="h-10 w-full rounded-xl border-0 bg-slate-100 pl-10 pr-10 text-sm text-slate-900 ring-1 ring-inset ring-slate-200
                   placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-brand-500"
      />
      <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-md bg-white px-1.5 text-[11px] font-semibold text-slate-400 ring-1 ring-slate-200 lg:block">/</kbd>
      {open && q.trim().length > 1 && (
        <div id="global-search-results" role="listbox"
             className="absolute left-0 right-0 z-50 mt-2 overflow-hidden rounded-2xl bg-white p-1.5 shadow-erl-lg ring-1 ring-brand-200/70">
          {matches.map((r, i) => (
            <button key={r.id} type="button" role="option" aria-selected={hi === i}
                    onMouseEnter={() => setHi(i)} onClick={() => go(`/referrals/${r.id}`)}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left ${hi === i ? 'bg-brand-50' : ''}`}>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-slate-900">{r.patientName}</span>
                <span className="block truncate text-xs text-slate-500">{r.origin_facility_name} → {r.target_facility_name}</span>
              </span>
              {r.urgency !== 'routine' && <UrgencyBadge urgency={r.urgency} />}
              <span className="erl-nums font-mono text-xs text-slate-500">{r.referral_code}</span>
            </button>
          ))}
          <button type="button" role="option" aria-selected={hi === matches.length}
                  onMouseEnter={() => setHi(matches.length)}
                  onClick={() => go(`/referrals?q=${encodeURIComponent(q.trim())}`)}
                  className={`flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-brand-700 ${hi === matches.length ? 'bg-brand-50' : ''}`}>
            <Icon name="search" className="h-4 w-4" />{t('search.all', { q: q.trim() })}
          </button>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------ NOTIFICATIONS */
function Notifications({ s }) {
  const t = useT();
  const nav = useNavigate();
  const items = [
    ...s.invites.map((c) => ({ key: `c${c.id}`, icon: 'message', title: t('notify.invite'), body: `${c.requester_name} · ${c.title}`, to: `/consultations/${c.id}`, urgent: c.priority === 'urgent' })),
    ...s.actions.slice(0, 8).map(({ r, step }) => ({ key: `r${r.id}`, icon: step.tone === 'danger' ? 'alert' : 'route', title: t(`next.${step.key}`), body: `${r.patientName} · ${r.referral_code}`, to: `/referrals/${r.id}`, urgent: r.urgency === 'emergency' })),
    ...(s.pendingUsers.length ? [{ key: 'u', icon: 'userCheck', title: t('notify.pending', { count: s.pendingUsers.length }), body: t('notify.pendingBody'), to: '/it' }] : []),
  ];
  const count = s.invites.length + s.actions.length + s.pendingUsers.length;
  return (
    <DropdownMenu
      trigger={(p) => (
        <button {...p} type="button" aria-label={t('notify.label', { count })}
                className="relative flex h-10 w-10 items-center justify-center rounded-xl text-slate-600 transition hover:bg-brand-50 hover:text-brand-700">
          <Icon name="bell" className="h-5 w-5" />
          {count > 0 && (
            <span className="erl-nums absolute right-1 top-1 min-w-[1.1rem] rounded-full bg-danger-500 px-1 text-center text-[10px] font-bold leading-[1.1rem] text-white ring-2 ring-white">
              {count > 99 ? '99+' : count}
            </span>
          )}
        </button>
      )}
      items={[
        { content: <p className="text-sm font-semibold text-slate-900">{t('notify.title')}</p> },
        null,
        ...(items.length ? items.map((it) => ({
          label: (
            <span className="block">
              <span className="flex items-center gap-1.5 font-semibold text-slate-900">
                {it.title}{it.urgent && <Badge className="bg-danger-100 text-danger-800 ring-danger-500/30">!</Badge>}
              </span>
              <span className="block truncate text-xs font-normal text-slate-500">{it.body}</span>
            </span>
          ),
          icon: it.icon,
          onClick: () => nav(it.to),
        })) : [{ content: <p className="py-3 text-center text-sm text-slate-500">{t('notify.empty')}</p> }]),
      ]}
      className="[&_[role=menu]]:w-[min(22rem,calc(100vw-2rem))] [&_[role=menu]]:max-h-[70vh] [&_[role=menu]]:overflow-y-auto"
    />
  );
}

/* ---------------------------------------------------------------- TOP BAR */
function TopBar({ user, s, referrals, onSignOut, isPatient }) {
  const t = useT();
  const L = useLabels();
  const [searchOpen, setSearchOpen] = useState(false);
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
      <div className="flex h-16 items-center gap-2 px-4 sm:gap-3 sm:px-6">
        <Link to={isPatient ? '/portal' : homeFor(user)} className={`shrink-0 ${isPatient ? '' : 'md:hidden'}`} aria-label="Ethio Referral Linkage">
          <LogoMark className="h-9 w-9" />
        </Link>

        {!isPatient && (
          <>
            <GlobalSearch referrals={referrals} className="hidden max-w-xl flex-1 sm:block" />
            <div className="flex-1 sm:hidden" />
            <button type="button" onClick={() => setSearchOpen(true)} aria-label={t('search.label')}
                    className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-600 hover:bg-brand-50 sm:hidden">
              <Icon name="search" className="h-5 w-5" />
            </button>
          </>
        )}
        {isPatient && <div className="flex-1" />}

        <LanguageToggle />
        {!isPatient && <Notifications s={s} />}

        <DropdownMenu
          className={isPatient ? '' : 'hidden md:block'}
          trigger={(p) => (
            <button {...p} type="button"
                    className="flex items-center gap-2.5 rounded-xl py-1 pl-1 pr-2 text-left transition hover:bg-brand-50">
              <Avatar name={user?.fullName} />
              <span className="hidden min-w-0 lg:block">
                <span className="block max-w-[180px] truncate text-sm font-semibold text-slate-900">{user?.fullName}</span>
                <span className="block max-w-[180px] truncate text-[11px] text-slate-500">{L.role(user?.role)}</span>
              </span>
              <Icon name="chevronDown" className="hidden h-4 w-4 text-slate-400 lg:block" />
            </button>
          )}
          items={[
            { content: (
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">{user?.fullName}</p>
                <p className="truncate text-xs text-slate-500">{L.role(user?.role)}{user?.facilityName ? ` · ${user.facilityName}` : ''}</p>
                {user?.username && <p className="mt-0.5 truncate font-mono text-[11px] text-slate-400">{user.username}</p>}
              </div>
            ) },
            null,
            { label: t('nav.signOut'), icon: 'logout', tone: 'danger', onClick: onSignOut },
          ]}
        />
      </div>

      <Sheet open={searchOpen} title={t('search.label')} onClose={() => setSearchOpen(false)}>
        <GlobalSearch referrals={referrals} onDone={() => setSearchOpen(false)} />
        <p className="mt-3 text-xs text-slate-500">{t('search.hint')}</p>
      </Sheet>
    </header>
  );
}

/* -------------------------------------------------------------- MOBILE NAV */
function MobileNav({ items, user, onSignOut }) {
  const t = useT();
  const L = useLabels();
  const [more, setMore] = useState(false);
  const loc = useLocation();
  const bar = items.filter((i) => !i.primary).slice(0, 3);
  const rest = items.filter((i) => !bar.includes(i) && !i.primary);
  useEffect(() => setMore(false), [loc.pathname]);
  const tab = 'relative flex flex-1 flex-col items-center gap-0.5 pt-2 pb-2.5 text-[11px] font-semibold transition';
  return (
    <>
      <nav aria-label={t('nav.main')}
           className="fixed inset-x-0 bottom-0 z-40 flex border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        {bar.map((it) => (
          <NavLink key={it.to} to={it.to} end={it.to === '/referrals'}
                   aria-describedby={it.badge ? `badge-bar-${it.icon}` : undefined}
                   className={({ isActive }) => `${tab} ${isActive ? 'text-brand-700' : 'text-slate-500'}`}>
            {({ isActive }) => (
              <>
                <span aria-hidden className={`absolute top-0 h-0.5 w-10 rounded-full ${isActive ? 'bg-brand-500' : 'bg-transparent'}`} />
                <span className="relative">
                  <Icon name={it.icon} className="h-6 w-6" />
                  {it.badge && <span aria-hidden className="erl-nums absolute -right-2.5 -top-1 min-w-[1.1rem] rounded-full bg-danger-500 px-1 text-center text-[10px] font-bold leading-[1.1rem] text-white">{it.badge}</span>}
                </span>
                <span className="max-w-full truncate px-1">{it.label}</span>
                {it.badge && <span id={`badge-bar-${it.icon}`} hidden>{t('nav.count', { count: it.badge })}</span>}
              </>
            )}
          </NavLink>
        ))}
        <button type="button" onClick={() => setMore(true)} className={`${tab} text-slate-500`} aria-haspopup="dialog">
          <Icon name="menu" className="h-6 w-6" />
          <span>{t('nav.more')}</span>
        </button>
      </nav>

      <Sheet open={more} title={t('nav.more')} onClose={() => setMore(false)}>
        <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200/80">
          <Avatar name={user?.fullName} className="h-11 w-11 text-sm" />
          <div className="min-w-0">
            <p className="truncate font-semibold text-slate-900">{user?.fullName}</p>
            <p className="truncate text-xs text-slate-500">{L.role(user?.role)}{user?.facilityName ? ` · ${user.facilityName}` : ''}</p>
          </div>
        </div>
        {rest.length > 0 && (
          <div className="mt-4 space-y-1">
            {rest.map((it) => (
              <NavLink key={it.to} to={it.to}
                       className={({ isActive }) => `flex min-h-[48px] items-center gap-3 rounded-xl px-3 font-semibold ${isActive ? 'bg-brand-50 text-brand-800' : 'text-slate-700 hover:bg-slate-50'}`}>
                <Icon name={it.icon} className="h-5 w-5 text-brand-600" />
                <span className="flex-1">{it.label}</span>
                <CountBadge n={it.badge} tone={it.badgeTone} />
              </NavLink>
            ))}
          </div>
        )}
        <div className="mt-4 flex items-center justify-between gap-3 rounded-xl px-3 py-2">
          <span className="flex items-center gap-3 font-semibold text-slate-700"><Icon name="globe" className="h-5 w-5 text-brand-600" />{t('common.language')}</span>
          <LanguageToggle />
        </div>
        <button type="button" onClick={onSignOut}
                className="mt-2 flex min-h-[48px] w-full items-center gap-3 rounded-xl px-3 font-semibold text-danger-700 hover:bg-danger-50">
          <Icon name="logout" className="h-5 w-5" />{t('nav.signOut')}
        </button>
      </Sheet>
    </>
  );
}

/* -------------------------------------------------------------------- SHELL */
export default function Shell({ children }) {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const t = useT();
  const isPatient = user?.role === 'patient';
  useWorkloadPolling(user);
  const wl = useWorkload();
  const s = useMemo(() => summarize(wl, user), [wl.referrals, wl.consultations, wl.users, user]); // eslint-disable-line react-hooks/exhaustive-deps
  const items = useNavItems(user, s);

  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem('erl_sidebar') === 'collapsed'; } catch { return false; }
  });
  function toggle() {
    setCollapsed((c) => {
      try { localStorage.setItem('erl_sidebar', c ? 'open' : 'collapsed'); } catch { /* ignore */ }
      return !c;
    });
  }
  function signOut() { logout(); useWorkload.getState().reset(); nav('/'); }

  // Hidden where the page has its own bottom action bar (wizard, case view).
  const showFab = SENDER_ROLES.includes(user?.role) && loc.pathname !== '/new' && !loc.pathname.startsWith('/referrals/');

  if (isPatient) {
    return (
      <div className="min-h-screen bg-slate-100">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[70] focus:rounded-lg focus:bg-white focus:px-3 focus:py-2">{t('nav.skip')}</a>
        <TopBar user={user} s={s} isPatient onSignOut={signOut} />
        <main id="main">{children}</main>
        <Toaster />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[70] focus:rounded-lg focus:bg-white focus:px-3 focus:py-2">{t('nav.skip')}</a>
      <Sidebar items={items} collapsed={collapsed} onToggle={toggle} />
      <div className={`md:pl-[72px] ${collapsed ? '' : 'lg:pl-64'} transition-[padding] duration-200`}>
        <TopBar user={user} s={s} referrals={wl.referrals} onSignOut={signOut} />
        {CONSULTATION_ROLES.includes(user?.role) && !DEMO_MODE && <ConsultationAlerts />}
        <main id="main" className="pb-28 md:pb-0">{children}</main>
      </div>

      {showFab && (
        <Link to="/new" aria-label={t('nav.newReferral')}
              className="fixed bottom-20 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-erl-lg ring-1 ring-brand-700/40 transition hover:bg-brand-700 md:hidden">
          <Icon name="plus" className="h-6 w-6" />
        </Link>
      )}
      <MobileNav items={items} user={user} onSignOut={signOut} />
      <Toaster />
    </div>
  );
}
