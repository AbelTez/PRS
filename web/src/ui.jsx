import React from 'react';
import { URGENCY_STYLE, statusStyle, humanStatus, humanCode } from './lib';

export function Badge({ children, className = '' }) {
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${className}`}>
      {children}
    </span>
  );
}

export const UrgencyBadge = ({ urgency }) => (
  <Badge className={URGENCY_STYLE[urgency] || URGENCY_STYLE.routine}>
    {urgency === 'emergency' ? '● EMERGENCY' : urgency === 'urgent' ? '● Urgent' : 'Routine'}
  </Badge>
);

export const StatusBadge = ({ status }) => (
  <Badge className={statusStyle(status)}>{humanStatus(status)}</Badge>
);

export function Button({ variant = 'primary', className = '', ...props }) {
  const variants = {
    primary: 'bg-brand-500 text-white hover:bg-brand-600 disabled:bg-slate-300',
    danger:  'bg-danger-500 text-white hover:bg-red-700 disabled:bg-slate-300',
    ember:   'bg-ember-500 text-white hover:bg-ember-400 disabled:bg-slate-300',
    ghost:   'bg-white text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50 disabled:text-slate-400',
  };
  return (
    <button
      {...props}
      // NFR-USA-08: large touch targets — clinicians often wear gloves
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold
                  min-h-[44px] transition disabled:cursor-not-allowed ${variants[variant]} ${className}`}
    />
  );
}

export function Card({ title, subtitle, children, actions, className = '' }) {
  return (
    <section className={`rounded-xl bg-white shadow-sm ring-1 ring-slate-200 ${className}`}>
      {(title || actions) && (
        <header className="flex items-start justify-between gap-3 border-b border-slate-200 px-4 py-3">
          <div>
            {title && <h2 className="font-semibold text-slate-900">{title}</h2>}
            {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
          </div>
          {actions}
        </header>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}

export function Field({ label, hint, required, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">
        {label} {required && <span className="text-danger-500">*</span>}
      </span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    </label>
  );
}

export const inputCls =
  'w-full rounded-lg border-0 px-3 py-2.5 text-base text-slate-900 ring-1 ring-inset ring-slate-300 ' +
  'placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-brand-500';

export const Input = (p) => <input {...p} className={`${inputCls} ${p.className || ''}`} />;
export const Select = (p) => <select {...p} className={`${inputCls} ${p.className || ''}`} />;
export const Textarea = (p) => <textarea {...p} className={`${inputCls} ${p.className || ''}`} />;

/**
 * Business-rule violations arrive as structured objects. Render them so the
 * clinician sees which rule fired and exactly what is missing — not "400".
 */
export function ErrorBox({ error, onDismiss }) {
  if (!error) return null;
  const d = error.detail || {};
  const msg = typeof d === 'string' ? d : d.message || error.message;
  const lists = [
    ['Missing vitals', d.missingVitals],
    ['Allowed reasons', d.allowedReasons || d.allowed],
  ].filter(([, v]) => Array.isArray(v) && v.length);

  return (
    <div className="rounded-lg bg-danger-50 p-3 ring-1 ring-red-200">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-red-800">{msg}</p>
        {onDismiss && (
          <button onClick={onDismiss} className="text-red-500 hover:text-red-700" aria-label="Dismiss">✕</button>
        )}
      </div>
      {d.hint && <p className="mt-1 text-sm text-red-700">{d.hint}</p>}
      {lists.map(([label, items]) => (
        <div key={label} className="mt-2">
          <p className="text-xs font-medium uppercase tracking-wide text-red-700">{label}</p>
          <div className="mt-1 flex flex-wrap gap-1">
            {items.map((i) => (
              <span key={i} className="rounded bg-white px-2 py-0.5 text-xs text-red-800 ring-1 ring-red-200">
                {humanCode(i)}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function Modal({ open, title, onClose, children, wide }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 sm:items-center sm:p-4">
      <div className={`w-full ${wide ? 'sm:max-w-2xl' : 'sm:max-w-lg'} max-h-[92vh] overflow-y-auto
                       rounded-t-2xl bg-white shadow-xl sm:rounded-2xl`}>
        <header className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
          <h3 className="font-semibold text-slate-900">{title}</h3>
          <button onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-100" aria-label="Close">✕</button>
        </header>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

export function Stat({ label, value, sub, tone = 'text-slate-900', target }) {
  return (
    <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${tone}`}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-slate-500">{sub}</p>}
      {target && <p className="mt-0.5 text-xs text-brand-600">{target}</p>}
    </div>
  );
}

export const Spinner = () => (
  <div className="flex justify-center p-8">
    <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-brand-500" />
  </div>
);

export const Empty = ({ children }) => (
  <p className="p-8 text-center text-sm text-slate-500">{children}</p>
);

/* ------------------------------------------------------------- RATINGS */
export function Stars({ value, count, size = 'text-sm', showValue = true }) {
  if (value == null) return <span className="text-xs text-slate-400">no ratings yet</span>;
  const full = Math.round(value);
  return (
    <span className={`inline-flex items-center gap-1 ${size}`}>
      <span className="text-amber-500" aria-label={`${value} out of 5 stars`}>
        {'★'.repeat(full)}{'☆'.repeat(5 - full)}
      </span>
      {showValue && <span className="font-medium text-slate-700">{value}</span>}
      {count != null && <span className="text-xs text-slate-500">({count})</span>}
    </span>
  );
}

export function StarInput({ value, onChange, label }) {
  return (
    <div>
      {label && <p className="mb-1 text-sm font-medium text-slate-700">{label}</p>}
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" onClick={() => onChange(n)}
                  aria-label={`${n} star${n > 1 ? 's' : ''}`}
                  className={`text-3xl leading-none transition ${n <= (value || 0) ? 'text-amber-500' : 'text-slate-300 hover:text-amber-300'}`}>
            ★
          </button>
        ))}
      </div>
    </div>
  );
}

/* --------------------------------------------------------- ATTACHMENTS */
const MAX_ATTACHMENT_BYTES = 1_500_000;

export function FileUpload({ onAdd, disabled }) {
  const [error, setError] = React.useState(null);
  function handle(e) {
    setError(null);
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    for (const file of files) {
      if (!/^image\/|^application\/pdf$/.test(file.type)) {
        setError(`${file.name}: only images (X-ray, MRI, ultrasound photos) and PDF documents are accepted.`);
        continue;
      }
      if (file.size > MAX_ATTACHMENT_BYTES) {
        setError(`${file.name} is ${(file.size / 1e6).toFixed(1)} MB — max 1.5 MB in the demo build. Compress or screenshot it.`);
        continue;
      }
      const reader = new FileReader();
      reader.onload = () => onAdd({ name: file.name, type: file.type, size: file.size, dataUrl: reader.result });
      reader.readAsDataURL(file);
    }
  }
  return (
    <div>
      <label className={`flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed
                         border-slate-300 bg-slate-50 px-4 py-6 text-center hover:border-brand-400 hover:bg-brand-50
                         ${disabled ? 'pointer-events-none opacity-50' : ''}`}>
        <span className="text-2xl" aria-hidden>🩻</span>
        <span className="text-sm font-medium text-slate-700">Attach X-ray, MRI, ultrasound or PDF report</span>
        <span className="text-xs text-slate-500">JPG, PNG or PDF · max 1.5 MB each</span>
        <input type="file" multiple accept="image/*,application/pdf" className="hidden" onChange={handle} disabled={disabled} />
      </label>
      {error && <p className="mt-1 text-xs text-red-700">{error}</p>}
    </div>
  );
}

/**
 * Attachment gallery.
 *
 * The list carries metadata only; file content is fetched on demand through
 * `onOpen(attachment)` (the API audits every read). Items that already carry a
 * `dataUrl` — e.g. files staged in the referral wizard before upload — render
 * their thumbnail directly.
 */
export function AttachmentList({ attachments, onRemove, onOpen, compact }) {
  const [preview, setPreview] = React.useState(null);
  const [loading, setLoading] = React.useState(null);
  if (!attachments?.length) return null;

  async function open(a) {
    if (a.dataUrl) { setPreview(a); return; }
    if (!onOpen) return;
    setLoading(a.id);
    try { setPreview(await onOpen(a)); }
    finally { setLoading(null); }
  }

  return (
    <>
      <ul className={`grid gap-2 ${compact ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-2 sm:grid-cols-4'}`}>
        {attachments.map((a, i) => (
          <li key={a.id || i} className="group relative overflow-hidden rounded-lg ring-1 ring-slate-200">
            <button type="button" onClick={() => open(a)} className="block w-full text-left">
              {a.dataUrl && a.type?.startsWith('image/') ? (
                <img src={a.dataUrl} alt={a.name} className="h-24 w-full bg-slate-900 object-cover" />
              ) : (
                <div className="flex h-24 w-full flex-col items-center justify-center bg-slate-100 text-slate-500">
                  <span className="text-2xl" aria-hidden>
                    {loading === a.id ? '⏳' : a.type === 'application/pdf' ? '📄' : a.type?.startsWith('image/') ? '🖼️' : '🗂️'}
                  </span>
                  <span className="text-xs">
                    {loading === a.id ? 'opening…'
                      : a.type === 'application/pdf' ? 'PDF document'
                      : a.type?.startsWith('image/') ? 'image — tap to view' : 'file'}
                  </span>
                </div>
              )}
              <div className="truncate bg-white px-2 py-1 text-xs text-slate-600">{a.name}</div>
              {a.uploadedBy && <div className="truncate bg-white px-2 pb-1 text-[10px] text-slate-400">{a.uploadedBy}</div>}
            </button>
            {onRemove && (
              <button type="button" onClick={() => onRemove(i)} aria-label="Remove attachment"
                      className="absolute right-1 top-1 rounded-full bg-slate-900/70 px-1.5 text-xs text-white opacity-0 transition group-hover:opacity-100">
                ✕
              </button>
            )}
          </li>
        ))}
      </ul>
      <Modal open={!!preview} title={preview?.name} wide onClose={() => setPreview(null)}>
        {preview?.type === 'application/pdf' ? (
          <iframe src={preview.dataUrl} title={preview.name} className="h-[70vh] w-full rounded-lg" />
        ) : (
          <img src={preview?.dataUrl} alt={preview?.name} className="mx-auto max-h-[70vh] rounded-lg" />
        )}
        <div className="mt-3 flex justify-between text-xs text-slate-500">
          <span>Uploaded by {preview?.uploadedBy || '—'}</span>
          <a href={preview?.dataUrl} download={preview?.name} className="font-medium text-brand-600">Download</a>
        </div>
      </Modal>
    </>
  );
}
