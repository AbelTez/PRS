import React from 'react';
import { URGENCY_STYLE, statusStyle, humanStatus, humanCode } from './lib';

/* ============================================================================
   SHARED UI — EthioReferral Linkage
   ----------------------------------------------------------------------------
   The visual layer every screen is built from. Each export keeps its exact
   props, behaviour and accessibility semantics; only the presentation is
   brand-specific. Change a token in index.css and the whole product follows.
   ========================================================================== */

/* ------------------------------------------------------------------ BADGE */
export function Badge({ children, className = '' }) {
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5
                  text-[11px] font-semibold uppercase tracking-[0.06em] ring-1 ring-inset ${className}`}
    >
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

/* ----------------------------------------------------------------- BUTTON */
export function Button({ variant = 'primary', className = '', ...props }) {
  const variants = {
    // brand-600 is the logo teal one shade deep: #4EB3BF cannot carry white
    // text at AA. Hover walks one step further down the same hue.
    primary: 'bg-brand-600 text-white ring-1 ring-brand-700/40 hover:bg-brand-700 active:bg-brand-800',
    danger:  'bg-danger-500 text-white ring-1 ring-danger-600/40 hover:bg-danger-600 active:bg-danger-700',
    ember:   'bg-ember-500 text-white ring-1 ring-ember-600/40 hover:bg-ember-600 active:bg-ember-700',
    ghost:   'bg-white text-brand-700 ring-1 ring-brand-200 hover:bg-brand-50 hover:text-brand-800 active:bg-brand-100',
  };
  return (
    <button
      {...props}
      // NFR-USA-08: large touch targets — clinicians often wear gloves
      className={`inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl px-4 py-2.5
                  text-sm font-semibold tracking-[-0.01em] shadow-erl-xs transition-all duration-200
                  disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100
                  disabled:text-slate-400 disabled:shadow-none disabled:ring-0
                  ${variants[variant]} ${className}`}
    />
  );
}

/* ------------------------------------------------------------------- CARD */
export function Card({ title, subtitle, children, actions, className = '' }) {
  return (
    <section
      className={`overflow-hidden rounded-2xl bg-white shadow-erl-md ring-1 ring-brand-200/60 ${className}`}
    >
      {(title || actions) && (
        <header className="flex items-start justify-between gap-3 border-b border-slate-200/80 bg-gradient-to-b from-brand-50/70 to-transparent px-4 py-3.5 sm:px-5">
          <div className="min-w-0">
            {title && (
              <h2 className="text-[15px] font-semibold tracking-[-0.018em] text-slate-900">{title}</h2>
            )}
            {subtitle && <p className="mt-0.5 text-sm leading-relaxed text-slate-500">{subtitle}</p>}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}

/* ------------------------------------------------------------------ FIELD */
export function Field({ label, hint, required, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-semibold tracking-[-0.01em] text-slate-700">
        {label} {required && <span className="text-danger-500">*</span>}
      </span>
      {children}
      {hint && <span className="mt-1.5 block text-xs leading-relaxed text-slate-500">{hint}</span>}
    </label>
  );
}

export const inputCls =
  'w-full rounded-xl border-0 bg-white px-3.5 py-2.5 text-base text-slate-900 shadow-erl-xs ' +
  'ring-1 ring-inset ring-brand-200 transition placeholder:text-slate-400 ' +
  'hover:ring-brand-300 ' +
  'focus:bg-white focus:shadow-erl-focus focus:ring-2 focus:ring-inset focus:ring-brand-500 ' +
  'disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 disabled:ring-slate-200';

export const Input = (p) => <input {...p} className={`${inputCls} ${p.className || ''}`} />;
export const Select = (p) => <select {...p} className={`${inputCls} ${p.className || ''}`} />;
export const Textarea = (p) => <textarea {...p} className={`${inputCls} ${p.className || ''}`} />;

/** Checkbox / radio sized for gloved hands and small phones. */
export const checkCls =
  'h-5 w-5 shrink-0 rounded-md border-0 text-brand-600 accent-brand-600 ring-1 ring-inset ' +
  'ring-slate-300 transition focus:ring-2 focus:ring-brand-500';

/* ------------------------------------------------------------------- NOTE */
/**
 * Inline advisory panel. Tone is presentation only — the same four states the
 * app already used (attention, error, success, neutral) with the brand's ramps.
 */
export function Notice({ tone = 'brand', icon, title, children, className = '', onDismiss }) {
  const tones = {
    brand:   'bg-brand-50 text-slate-700 ring-brand-200 [&_strong]:text-brand-800',
    warn:    'bg-ember-50 text-slate-700 ring-ember-200 [&_strong]:text-ember-700',
    error:   'bg-danger-50 text-slate-700 ring-danger-200 [&_strong]:text-danger-700',
    success: 'bg-emerald-50 text-slate-700 ring-emerald-200 [&_strong]:text-emerald-700',
  };
  return (
    <div className={`rounded-xl p-4 text-sm leading-relaxed ring-1 ${tones[tone]} ${className}`}>
      <div className="flex items-start gap-2.5">
        {icon && <span className="mt-0.5 shrink-0 text-brand-600" aria-hidden>{icon}</span>}
        <div className="min-w-0 flex-1">
          {title && <p className="font-semibold">{title}</p>}
          {children && <div className={title ? 'mt-0.5' : ''}>{children}</div>}
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="-mr-1 -mt-1 shrink-0 rounded-lg p-1 text-current opacity-60 transition hover:bg-black/5 hover:opacity-100"
            aria-label="Dismiss"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}

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
    <div className="rounded-xl bg-danger-50 p-3.5 ring-1 ring-danger-200">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-danger-800">{msg}</p>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="-mr-1 -mt-1 shrink-0 rounded-lg p-1 text-danger-500 transition hover:bg-danger-100 hover:text-danger-700"
            aria-label="Dismiss"
          >
            ✕
          </button>
        )}
      </div>
      {d.hint && <p className="mt-1 text-sm text-danger-700">{d.hint}</p>}
      {lists.map(([label, items]) => (
        <div key={label} className="mt-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-danger-700">{label}</p>
          <div className="mt-1.5 flex flex-wrap gap-1">
            {items.map((i) => (
              <span
                key={i}
                className="rounded-lg bg-white px-2 py-0.5 text-xs font-medium text-danger-800 ring-1 ring-danger-200"
              >
                {humanCode(i)}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ MODAL */
export function Modal({ open, title, onClose, children, wide }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/45 p-0 backdrop-blur-[2px] sm:items-center sm:p-4">
      <div
        className={`erl-scroll w-full ${wide ? 'sm:max-w-2xl' : 'sm:max-w-lg'} max-h-[92vh] overflow-y-auto
                    rounded-t-3xl bg-white shadow-erl-lg ring-1 ring-brand-200/70 sm:rounded-2xl`}
      >
        <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-slate-200/80 bg-white/95 px-4 py-3.5 backdrop-blur sm:px-5">
          <h3 className="text-[15px] font-semibold tracking-[-0.018em] text-slate-900">{title}</h3>
          <button
            onClick={onClose}
            className="shrink-0 rounded-lg p-1.5 text-slate-400 transition hover:bg-brand-50 hover:text-brand-700"
            aria-label="Close"
          >
            ✕
          </button>
        </header>
        <div className="p-4 sm:p-5">{children}</div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------- STAT */
export function Stat({ label, value, sub, tone = 'text-slate-900', target }) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-white p-4 shadow-erl-sm ring-1 ring-brand-200/60">
      <span
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-brand-300 via-brand-500 to-brand-300"
      />
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <p className={`erl-nums mt-1.5 text-[26px] font-semibold leading-none tracking-[-0.03em] ${tone}`}>
        {value}
      </p>
      {sub && <p className="mt-1.5 text-xs text-slate-500">{sub}</p>}
      {target && <p className="mt-1.5 text-xs font-medium text-brand-600">{target}</p>}
    </div>
  );
}

export const Spinner = () => (
  <div className="flex justify-center p-8">
    <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-100 border-t-brand-500" />
  </div>
);

export const Empty = ({ children }) => (
  <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
    <span
      aria-hidden="true"
      className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-50 text-lg ring-1 ring-brand-100"
    >
      ◌
    </span>
    <p className="max-w-sm text-sm leading-relaxed text-slate-500">{children}</p>
  </div>
);

/* --------------------------------------------------------------- RATINGS */
export function Stars({ value, count, size = 'text-sm', showValue = true }) {
  if (value == null) return <span className="text-xs text-slate-400">no ratings yet</span>;
  const full = Math.round(value);
  return (
    <span className={`inline-flex items-center gap-1 ${size}`}>
      <span className="text-ember-400" aria-label={`${value} out of 5 stars`}>
        {'★'.repeat(full)}{'☆'.repeat(5 - full)}
      </span>
      {showValue && <span className="font-semibold text-slate-700">{value}</span>}
      {count != null && <span className="text-xs text-slate-500">({count})</span>}
    </span>
  );
}

export function StarInput({ value, onChange, label }) {
  return (
    <div>
      {label && <p className="mb-1 text-sm font-semibold text-slate-700">{label}</p>}
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" onClick={() => onChange(n)}
                  aria-label={`${n} star${n > 1 ? 's' : ''}`}
                  className={`text-3xl leading-none transition ${
                    n <= (value || 0)
                      ? 'text-ember-400 hover:text-ember-500'
                      : 'text-slate-300 hover:text-brand-300'
                  }`}>
            ★
          </button>
        ))}
      </div>
    </div>
  );
}

/* ----------------------------------------------------------- ATTACHMENTS */
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
      <label
        className={`flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-2xl border-2
                    border-dashed border-brand-200 bg-brand-50/50 px-4 py-7 text-center transition
                    hover:border-brand-400 hover:bg-brand-50
                    ${disabled ? 'pointer-events-none opacity-50' : ''}`}
      >
        <span
          aria-hidden
          className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-xl shadow-erl-xs ring-1 ring-brand-200"
        >
          🩻
        </span>
        <span className="text-sm font-semibold text-slate-700">
          Attach X-ray, MRI, ultrasound or PDF report
        </span>
        <span className="text-xs text-slate-500">JPG, PNG or PDF · max 1.5 MB each</span>
        <input
          type="file" multiple accept="image/*,application/pdf" className="hidden"
          onChange={handle} disabled={disabled}
        />
      </label>
      {error && <p className="mt-1.5 text-xs font-medium text-danger-700">{error}</p>}
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
      <ul className={`grid gap-2.5 ${compact ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-2 sm:grid-cols-4'}`}>
        {attachments.map((a, i) => (
          <li
            key={a.id || i}
            className="group relative overflow-hidden rounded-xl bg-white shadow-erl-xs ring-1 ring-brand-200/70"
          >
            <button type="button" onClick={() => open(a)} className="block w-full text-left">
              {a.dataUrl && a.type?.startsWith('image/') ? (
                <img src={a.dataUrl} alt={a.name} className="h-24 w-full bg-slate-900 object-cover" />
              ) : (
                <div className="flex h-24 w-full flex-col items-center justify-center gap-1 bg-brand-50 text-slate-500">
                  <span className="text-2xl" aria-hidden>
                    {loading === a.id ? '⏳' : a.type === 'application/pdf' ? '📄' : a.type?.startsWith('image/') ? '🖼️' : '🗂️'}
                  </span>
                  <span className="text-[11px] font-medium">
                    {loading === a.id ? 'opening…'
                      : a.type === 'application/pdf' ? 'PDF document'
                      : a.type?.startsWith('image/') ? 'image — tap to view' : 'file'}
                  </span>
                </div>
              )}
              <div className="truncate px-2.5 py-1.5 text-xs font-medium text-slate-700">{a.name}</div>
              {a.uploadedBy && (
                <div className="truncate border-t border-slate-100 px-2.5 pb-1.5 text-[10px] text-slate-400">
                  {a.uploadedBy}
                </div>
              )}
            </button>
            {onRemove && (
              <button
                type="button" onClick={() => onRemove(i)} aria-label="Remove attachment"
                className="absolute right-1.5 top-1.5 rounded-full bg-slate-900/60 px-1.5 text-xs text-white opacity-0 transition group-hover:opacity-100"
              >
                ✕
              </button>
            )}
          </li>
        ))}
      </ul>
      <Modal open={!!preview} title={preview?.name} wide onClose={() => setPreview(null)}>
        {preview?.type === 'application/pdf' ? (
          <iframe src={preview.dataUrl} title={preview.name} className="h-[70vh] w-full rounded-xl" />
        ) : (
          <img src={preview?.dataUrl} alt={preview?.name} className="mx-auto max-h-[70vh] rounded-xl" />
        )}
        <div className="mt-3 flex justify-between text-xs text-slate-500">
          <span>Uploaded by {preview?.uploadedBy || '—'}</span>
          <a href={preview?.dataUrl} download={preview?.name} className="font-semibold text-brand-600 hover:text-brand-700">
            Download
          </a>
        </div>
      </Modal>
    </>
  );
}
