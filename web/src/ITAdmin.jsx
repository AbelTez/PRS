import React, { useCallback, useEffect, useState } from 'react';
import { get, post, useAuth, humanCode, timeAgo } from './lib';
import {
  Button, Card, Field, Input, Select, ErrorBox, Badge, Modal, Spinner, Empty,
} from './ui';

/**
 * Facility IT administration.
 *
 * The trust model of the whole exchange lives here: an account only acts in a
 * hospital's name if that hospital's own IT administrator registered it AND
 * verified it (license check for clinical roles). A Black Lion referral can
 * therefore only originate from verified Black Lion staff — and the same on
 * the receiving side.
 */

const STAFF_ROLES = [
  ['doctor', 'Doctor / clinician — creates and sends referrals'],
  ['liaison', 'Referral liaison — receives, accepts/declines, reserves beds'],
  ['triage', 'Triage nurse — confirms arrivals'],
  ['hew', 'Health extension worker — community referrals'],
  ['facility_admin', 'Facility administrator'],
  ['it_admin', 'IT administrator'],
];

const STATUS_BADGE = {
  active: 'bg-emerald-100 text-emerald-800 ring-emerald-600/30',
  pending: 'bg-amber-100 text-amber-900 ring-amber-600/30',
  disabled: 'bg-slate-200 text-slate-600 ring-slate-400/30',
};

export default function ITAdmin() {
  const user = useAuth((s) => s.user);
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const [created, setCreated] = useState(null);
  const [f, setF] = useState({ role: 'doctor' });

  const load = useCallback(() => { get('/v1/users').then(setRows).catch(setError); }, []);
  useEffect(load, [load]);

  async function act(id, action) {
    setBusy(id); setError(null);
    try { await post(`/v1/users/${id}/${action}`); load(); }
    catch (e) { setError(e); } finally { setBusy(null); }
  }

  async function create() {
    setBusy('new'); setError(null);
    try {
      const r = await post('/v1/users', f);
      setCreated(r); setShowNew(false); setF({ role: 'doctor' }); load();
    } catch (e) { setError(e); } finally { setBusy(null); }
  }

  if (!rows) return <Spinner />;
  const pending = rows.filter((u) => u.status === 'pending');
  const others = rows.filter((u) => u.status !== 'pending');

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold">Staff accounts</h1>
          <p className="text-sm text-slate-500">
            {user.facilityName} — only accounts you verify here can act in this facility's name.
          </p>
        </div>
        <Button onClick={() => setShowNew(true)}>+ Register staff</Button>
      </div>

      <ErrorBox error={error} onDismiss={() => setError(null)} />

      {created && (
        <div className="rounded-lg bg-emerald-50 p-3 text-sm ring-1 ring-emerald-200">
          <p className="font-medium text-emerald-800">
            Account <span className="font-mono">{created.username}</span> created — status: pending verification.
          </p>
          <p className="text-emerald-700">{created.note}</p>
          <button onClick={() => setCreated(null)} className="mt-1 text-xs text-emerald-700 underline">dismiss</button>
        </div>
      )}

      {pending.length > 0 && (
        <Card title={`Awaiting verification (${pending.length})`}
              subtitle="Check the professional license against the MoH register before activating a clinical account">
          <div className="space-y-2">
            {pending.map((u) => (
              <div key={u.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-amber-50 p-3 ring-1 ring-amber-200">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900">{u.fullName}
                    <span className="ml-2 font-mono text-xs text-slate-500">{u.username}</span></p>
                  <p className="text-sm text-slate-600">{humanCode(u.role)}{u.title && ` · ${u.title}`}</p>
                  {u.licenseNumber && <p className="text-xs text-slate-500">License: <span className="font-mono">{u.licenseNumber}</span> — verify at MoH HRIS</p>}
                  <p className="text-xs text-slate-400">Requested {timeAgo(u.createdAt)}</p>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => act(u.id, 'verify')} disabled={busy === u.id}>Verify & activate</Button>
                  <Button variant="ghost" onClick={() => act(u.id, 'deactivate')} disabled={busy === u.id}>Reject</Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card title="Registered staff" subtitle="Deactivated accounts lose access immediately, on every device">
        {others.length === 0 ? <Empty>No staff yet.</Empty> : (
          <div className="divide-y divide-slate-100">
            {others.map((u) => (
              <div key={u.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="font-medium text-slate-900">
                    {u.fullName}
                    <span className="ml-2 font-mono text-xs text-slate-500">{u.username}</span>
                  </p>
                  <p className="text-sm text-slate-600">
                    {humanCode(u.role)}{u.title ? ` · ${u.title}` : ''}{u.department ? ` · ${u.department}` : ''}
                  </p>
                  <p className="text-xs text-slate-500">
                    {u.licenseNumber && <>License <span className="font-mono">{u.licenseNumber}</span> · </>}
                    {u.verifiedAt ? `verified ${timeAgo(u.verifiedAt)} by ${u.verifiedBy}` : 'not verified'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={STATUS_BADGE[u.status]}>{humanCode(u.status)}</Badge>
                  {u.status === 'active' && u.id !== user.id && !['sysadmin'].includes(u.role) && (
                    <Button variant="ghost" onClick={() => act(u.id, 'deactivate')} disabled={busy === u.id}>Deactivate</Button>
                  )}
                  {u.status === 'disabled' && (
                    <Button variant="ghost" onClick={() => act(u.id, 'reactivate')} disabled={busy === u.id}>Reactivate</Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Modal open={showNew} title={`Register staff — ${user.facilityName}`} onClose={() => setShowNew(false)}>
        <div className="space-y-3">
          <p className="text-sm text-slate-600">
            The account is created in <span className="font-medium">pending</span> state and cannot sign in
            until you verify it. Clinical roles require the MoH professional license number.
          </p>
          <Field label="Full name" required><Input value={f.fullName || ''}
                 onChange={(e) => setF({ ...f, fullName: e.target.value })} placeholder="Dr Alem …" /></Field>
          <Field label="Username" required><Input value={f.username || ''}
                 onChange={(e) => setF({ ...f, username: e.target.value })} autoCapitalize="none" placeholder="dr.alem" /></Field>
          <Field label="Role" required>
            <Select value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })}>
              {STAFF_ROLES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Field>
          {['doctor', 'specialist'].includes(f.role) && (
            <Field label="MoH license number" required hint="Checked against the national health-professional register">
              <Input value={f.licenseNumber || ''} onChange={(e) => setF({ ...f, licenseNumber: e.target.value })}
                     placeholder="MOH-MD-…" />
            </Field>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Title"><Input value={f.title || ''} onChange={(e) => setF({ ...f, title: e.target.value })}
                   placeholder="General Practitioner" /></Field>
            <Field label="Phone"><Input value={f.phone || ''} onChange={(e) => setF({ ...f, phone: e.target.value })}
                   placeholder="+2519…" inputMode="tel" /></Field>
          </div>
          <ErrorBox error={error} />
          <Button className="w-full" onClick={create}
                  disabled={busy === 'new' || !f.fullName || !f.username}>
            {busy === 'new' ? 'Creating…' : 'Create pending account'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
