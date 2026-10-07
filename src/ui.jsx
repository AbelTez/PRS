import React, { useEffect, useRef, useState } from 'react';
import { create } from 'zustand';
import { URGENCY_STYLE, statusStyle, humanCode, slaLabel, formatDual } from './lib';
import { useT, useLabels } from './i18n';
import { Icon } from './brand';

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

export function UrgencyBadge({ urgency }) {
  const L = useLabels();
  return (
    <Badge className={URGENCY_STYLE[urgency] || URGENCY_STYLE.routine}>
      {urgency !== 'routine' && <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />}
      {L.urgency(urgency || 'routine')}
    </Badge>
  );
}

export function StatusBadge({ status }) {
  const L = useLabels();
  return <Badge className={statusStyle(status)}>{L.status(status)}</Badge>;
}

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
            <Icon name="x" className="h-4 w-4" />
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
            <Icon name="x" className="h-4 w-4" />
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
/** Escape closes, focus moves into the dialog and returns to the opener afterwards. */
function useDialog(open, onClose) {
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const opener = document.activeElement;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
      if (e.key !== 'Tab' || !ref.current) return;
      const controls = [...ref.current.querySelectorAll('button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')]
        .filter((el) => el.getClientRects().length > 0);
      const first = controls[0], last = controls[controls.length - 1];
      if (!first) { e.preventDefault(); ref.current.focus(); }
      else if (e.shiftKey && (document.activeElement === first || document.activeElement === ref.current)) {
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && (document.activeElement === last || document.activeElement === ref.current)) {
        e.preventDefault(); first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    const t = setTimeout(() => {
      // Focus the panel itself (screen readers announce its label) unless a
      // field opts in — never land on a destructive button by accident.
      const el = ref.current?.querySelector('[data-autofocus]');
      (el || ref.current)?.focus?.();
    }, 0);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      clearTimeout(t);
      document.body.style.overflow = prevOverflow;
      opener?.focus?.();
    };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  return ref;
}

export function Modal({ open, title, onClose, children, wide }) {
  const ref = useDialog(open, onClose);
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/45 p-0 backdrop-blur-[2px] animate-erl-fade sm:items-center sm:p-4"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
    >
      <div
        ref={ref} role="dialog" aria-modal="true" aria-label={typeof title === 'string' ? title : undefined} tabIndex={-1}
        className={`erl-scroll w-full ${wide ? 'sm:max-w-2xl' : 'sm:max-w-lg'} max-h-[92vh] overflow-y-auto
                    rounded-t-3xl bg-white shadow-erl-lg ring-1 ring-brand-200/70 outline-none sm:rounded-2xl`}
      >
        <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-slate-200/80 bg-white/95 px-4 py-3.5 backdrop-blur sm:px-5">
          <h3 className="text-[15px] font-semibold tracking-[-0.018em] text-slate-900">{title}</h3>
          <button
            onClick={onClose}
            className="shrink-0 rounded-lg p-1.5 text-slate-400 transition hover:bg-brand-50 hover:text-brand-700"
            aria-label="Close"
          >
            <Icon name="x" className="h-4 w-4" />
          </button>
        </header>
        <div className="p-4 sm:p-5">{children}</div>
      </div>
    </div>
  );
}

/**
 * A task panel: bottom sheet on phones, right-hand drawer from `sm` up.
 * Used for referral actions so the case stays visible beside the form.
 */
export function Sheet({ open, title, description, onClose, children, footer }) {
  const ref = useDialog(open, onClose);
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-end bg-slate-900/40 backdrop-blur-[2px] animate-erl-fade sm:items-stretch sm:justify-end"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
    >
      <div
        ref={ref} role="dialog" aria-modal="true" aria-label={typeof title === 'string' ? title : undefined} tabIndex={-1}
        className="flex max-h-[92vh] w-full flex-col rounded-t-3xl bg-white shadow-erl-lg outline-none
                   sm:max-h-none sm:max-w-md sm:rounded-none sm:rounded-l-2xl"
      >
        <header className="flex items-start justify-between gap-3 border-b border-slate-200/80 px-5 py-4">
          <div className="min-w-0">
            <h3 className="text-base font-semibold tracking-[-0.018em] text-slate-900">{title}</h3>
            {description && <p className="mt-1 text-sm leading-relaxed text-slate-500">{description}</p>}
          </div>
          <button
            onClick={onClose} aria-label="Close"
            className="shrink-0 rounded-lg p-1.5 text-slate-400 transition hover:bg-brand-50 hover:text-brand-700"
          >
            <Icon name="x" className="h-4 w-4" />
          </button>
        </header>
        <div className="erl-scroll flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <footer className="border-t border-slate-200/80 bg-slate-50/80 px-5 py-3.5">{footer}</footer>}
      </div>
    </div>
  );
}

/** A yes/no confirmation that states the consequence in plain words. */
export function ConfirmDialog({ open, title, body, confirmLabel, cancelLabel, tone = 'primary', busy, onConfirm, onClose }) {
  const t = useT();
  return (
    <Modal open={open} title={title} onClose={onClose}>
      <div className="space-y-4">
        {body && <div className="text-sm leading-relaxed text-slate-600">{body}</div>}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={onClose}>{cancelLabel || t('common.cancel')}</Button>
          <Button variant={tone} onClick={onConfirm} disabled={busy}>{confirmLabel || t('common.confirm')}</Button>
        </div>
      </div>
    </Modal>
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
      <Icon name="inbox" className="h-5 w-5 text-brand-500" />
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
          className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-brand-600 shadow-erl-xs ring-1 ring-brand-200"
        >
          <Icon name="xray" className="h-5 w-5" />
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
                  <span className="text-brand-500" aria-hidden>
                    <Icon
                      name={loading === a.id ? 'loader' : a.type === 'application/pdf' ? 'doc' : a.type?.startsWith('image/') ? 'image' : 'clip'}
                      className={`h-7 w-7 ${loading === a.id ? 'animate-spin' : ''}`}
                    />
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
                className="absolute right-1.5 top-1.5 rounded-full bg-slate-900/60 p-1 text-white opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100"
              >
                <Icon name="x" className="h-3.5 w-3.5" />
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

/* ============================================================================
   WORKSPACE BUILDING BLOCKS (redesign phase 1)
   ========================================================================== */

/** Page width + gutters. `wide` for work surfaces, `narrow` for reading/forms. */
export function Page({ children, width = 'wide', className = '' }) {
  const w = { wide: 'max-w-7xl', medium: 'max-w-5xl', narrow: 'max-w-3xl' }[width];
  return <div className={`mx-auto w-full ${w} space-y-5 px-4 py-5 sm:px-6 sm:py-7 ${className}`}>{children}</div>;
}

/* ------------------------------------------------------------------- TABS */
/**
 * One tab/segment style for the whole app. `items`: [{ value, label, count? }].
 * Renders as a scrollable row on phones so labels never wrap.
 */
export function Tabs({ items, value, onChange, label, className = '' }) {
  return (
    <div role="tablist" aria-label={label}
         className={`erl-scroll -mx-1 flex gap-1 overflow-x-auto px-1 pb-0.5 ${className}`}>
      {items.map((it) => {
        const active = it.value === value;
        return (
          <button
            key={it.value} role="tab" aria-selected={active} type="button"
            onClick={() => onChange(it.value)}
            className={`inline-flex min-h-[40px] shrink-0 items-center gap-2 rounded-xl px-3.5 text-sm font-semibold transition
              ${active
                ? 'bg-brand-600 text-white shadow-erl-xs'
                : 'bg-white text-slate-600 ring-1 ring-brand-200/70 hover:bg-brand-50 hover:text-brand-700'}`}
          >
            {it.label}
            {it.count != null && (
              <span className={`erl-nums min-w-[1.4rem] rounded-full px-1.5 text-center text-[11px] font-bold leading-5
                ${active ? 'bg-white/20 text-white' : it.alert ? 'bg-ember-100 text-ember-800' : 'bg-slate-100 text-slate-600'}`}>
                {it.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ---------------------------------------------------------------- TOOLBAR */
export const SearchInput = React.forwardRef(function SearchInput({ value, onChange, placeholder, className = '', ...rest }, ref) {
  return (
    <div className={`relative ${className}`}>
      <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400" />
      <input
        ref={ref} type="search" value={value} placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={`${inputCls} pl-10`}
        {...rest}
      />
    </div>
  );
});

/** Toggleable filter pill. `active` filters show a check so state is not colour-only. */
export function FilterChip({ active, onClick, children, tone = 'brand' }) {
  const on = {
    brand: 'bg-brand-600 text-white ring-brand-700/40',
    danger: 'bg-danger-500 text-white ring-danger-600/40',
    ember: 'bg-ember-500 text-white ring-ember-600/40',
  }[tone];
  return (
    <button
      type="button" aria-pressed={!!active} onClick={onClick}
      className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold ring-1 transition
        ${active ? on : 'bg-white text-slate-600 ring-slate-300/80 hover:bg-brand-50 hover:text-brand-700 hover:ring-brand-300'}`}
    >
      {active && <Icon name="check" className="h-3.5 w-3.5" />}
      {children}
    </button>
  );
}

/* --------------------------------------------------------------- SKELETON */
export const Skeleton = ({ className = 'h-4 w-full' }) => (
  <span aria-hidden className={`block animate-pulse rounded-lg bg-slate-200/80 ${className}`} />
);

/** A stack of list-row placeholders shown while a queue loads. */
export function SkeletonRows({ rows = 5 }) {
  return (
    <div className="space-y-2.5" role="status" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-3 rounded-2xl bg-white p-4 shadow-erl-xs ring-1 ring-brand-200/50">
          <Skeleton className="h-12 w-1 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-32" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------ EMPTY STATE */
export function EmptyState({ icon = 'inbox', title, children, action, tone = 'brand', className = '' }) {
  const tones = {
    brand: 'bg-brand-50 text-brand-600 ring-brand-100',
    success: 'bg-emerald-50 text-emerald-600 ring-emerald-100',
    warn: 'bg-ember-50 text-ember-600 ring-ember-100',
  };
  return (
    <div className={`flex flex-col items-center gap-3 px-4 py-10 text-center ${className}`}>
      <span aria-hidden className={`flex h-12 w-12 items-center justify-center rounded-2xl ring-1 ${tones[tone]}`}>
        <Icon name={icon} className="h-6 w-6" />
      </span>
      {title && <p className="text-base font-semibold text-slate-900">{title}</p>}
      {children && <div className="max-w-md text-sm leading-relaxed text-slate-500">{children}</div>}
      {action && <div className="mt-1 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ TOAST */
export const useToast = create((set) => ({
  toasts: [],
  push(message, tone = 'success') {
    const id = Math.random().toString(36).slice(2);
    set((s) => ({ toasts: [...s.toasts, { id, message, tone }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })), 5000);
  },
  dismiss(id) { set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })); },
}));
export const toast = (message, tone) => useToast.getState().push(message, tone);

export function Toaster() {
  const { toasts, dismiss } = useToast();
  const tones = {
    success: ['checkCircle', 'text-emerald-600'],
    error: ['alert', 'text-danger-600'],
    info: ['info', 'text-brand-600'],
  };
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex flex-col items-center gap-2 px-4 sm:items-end sm:px-6 md:bottom-24">
      {toasts.map((x) => {
        const [icon, color] = tones[x.tone] || tones.info;
        return (
          <div key={x.id} role="status"
               className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl bg-white p-3.5 text-sm shadow-erl-lg ring-1 ring-brand-200/70 animate-erl-rise">
            <Icon name={icon} className={`mt-0.5 h-5 w-5 shrink-0 ${color}`} />
            <p className="min-w-0 flex-1 font-medium text-slate-800">{x.message}</p>
            <button onClick={() => dismiss(x.id)} aria-label="Dismiss"
                    className="-m-1 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
              <Icon name="x" className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

/* ----------------------------------------------------------------- AVATAR */
export function Avatar({ name = '', className = 'h-9 w-9 text-xs', tone = 'brand' }) {
  const initials = name.replace(/^(Dr|Sr|W\/ro|Ato)\.?\s+/i, '').split(/\s+/).filter(Boolean)
    .slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  const tones = {
    brand: 'bg-brand-100 text-brand-800 ring-brand-200',
    light: 'bg-white/15 text-white ring-white/25',
  };
  return (
    <span aria-hidden className={`inline-flex shrink-0 items-center justify-center rounded-full font-bold ring-1 ${tones[tone]} ${className}`}>
      {initials || '•'}
    </span>
  );
}

/* --------------------------------------------------------- DROPDOWN MENU */
/**
 * Minimal accessible menu. `trigger` receives props to spread on a button.
 * Items: [{ label, icon?, onClick, tone?, disabled? }] or null for a divider.
 */
export function DropdownMenu({ trigger, items, align = 'right', className = '' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey); };
  }, [open]);
  return (
    <div ref={ref} className={`relative ${className}`}>
      {trigger({ 'aria-haspopup': 'menu', 'aria-expanded': open, onClick: () => setOpen((o) => !o) })}
      {open && (
        <div role="menu"
             className={`absolute z-50 min-w-[14rem] overflow-hidden rounded-2xl bg-white p-1.5 shadow-erl-lg ring-1 ring-brand-200/70 animate-erl-fade
               ${align === 'left' ? 'left-0' : 'right-0'} ${align === 'up' ? 'bottom-full mb-2' : 'mt-2'}`}>
          {items.filter((it) => it !== false).map((it, i) => it === null ? (
            <div key={`d${i}`} className="my-1 h-px bg-slate-200/80" />
          ) : it.content ? (
            <div key={i} className="px-3 py-2">{it.content}</div>
          ) : (
            <button
              key={i} role="menuitem" type="button" disabled={it.disabled}
              onClick={() => { setOpen(false); it.onClick?.(); }}
              className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition disabled:opacity-40
                ${it.tone === 'danger' ? 'text-danger-700 hover:bg-danger-50' : 'text-slate-700 hover:bg-brand-50 hover:text-brand-800'}`}
            >
              {it.icon && <Icon name={it.icon} className="h-4.5 w-4.5 shrink-0 opacity-80" />}
              <span className="min-w-0 flex-1">{it.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------ COPY BUTTON */
export function CopyButton({ value, className = '' }) {
  const t = useT();
  const [done, setDone] = useState(false);
  async function copy() {
    try { await navigator.clipboard.writeText(value); setDone(true); setTimeout(() => setDone(false), 1500); }
    catch { /* clipboard blocked: the code stays selectable */ }
  }
  return (
    <button type="button" onClick={copy} aria-label={done ? t('common.copied') : t('common.copyCode')}
            title={done ? t('common.copied') : t('common.copyCode')}
            className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-1 font-mono text-sm font-semibold text-slate-600
                        ring-1 ring-slate-200 transition hover:bg-brand-50 hover:text-brand-700 hover:ring-brand-300 ${className}`}>
      <span className="erl-nums">{value}</span>
      <Icon name={done ? 'check' : 'copy'} className={`h-3.5 w-3.5 ${done ? 'text-emerald-600' : ''}`} />
    </button>
  );
}

/* ------------------------------------------------------- URGENCY + SLA */
/** The left colour rail on list rows: urgency by position and colour, never colour alone. */
export const UrgencyBar = ({ urgency, className = '' }) => (
  <span aria-hidden className={`w-1 shrink-0 self-stretch rounded-full ${
    urgency === 'emergency' ? 'bg-danger-500' : urgency === 'urgent' ? 'bg-ember-400' : 'bg-slate-200'} ${className}`} />
);

/** SLA countdown as a chip. Overdue → red, < 10 min → amber. */
export function SlaChip({ minutes, className = '' }) {
  const t = useT();
  const sla = slaLabel(minutes);
  if (!sla) return null;
  const tone = minutes < 0 ? 'bg-danger-50 text-danger-700 ring-danger-200'
    : minutes < 10 ? 'bg-ember-50 text-ember-700 ring-ember-200' : 'bg-slate-50 text-slate-600 ring-slate-200';
  const text = minutes < 0 ? t('sla.overdue', { n: Math.abs(minutes) }) : t('sla.left', { n: minutes });
  return (
    <span className={`erl-nums inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ${tone} ${className}`}>
      <Icon name="clock" className="h-3.5 w-3.5" />{text}
    </span>
  );
}

/* ------------------------------------------------------ LIFECYCLE STEPPER */
/**
 * Horizontal journey on wide screens, vertical on phones.
 * `steps`: labels; `index`: current stage; `branch`: label shown when the
 * referral left the happy path at `index` (declined, lapsed, closed…).
 */
export function LifecycleStepper({ steps, index, branch, branchTone = 'danger', done }) {
  const t = useT();
  const branchCls = branchTone === 'danger' ? 'bg-danger-500 ring-danger-100' : 'bg-ember-500 ring-ember-100';
  const reached = done && !branch ? steps.length : index + 1;
  return (
    <>
    {/* phones: one line + segmented bar instead of eight stacked steps */}
    <div className="sm:hidden" aria-label="Referral progress">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm font-semibold text-slate-900">
          {steps[index]}
          {branch && <span className={`ml-1.5 font-semibold ${branchTone === 'danger' ? 'text-danger-700' : 'text-ember-700'}`}>· {branch}</span>}
        </p>
        <p className="erl-nums shrink-0 text-xs text-slate-500">{t('life.stepOf', { n: Math.min(index + 1, steps.length), total: steps.length })}</p>
      </div>
      <div className="mt-2 flex gap-1" aria-hidden>
        {steps.map((label, i) => (
          <span key={label} className={`h-1.5 flex-1 rounded-full ${
            i < reached - (branch ? 1 : 0) ? 'bg-brand-500' : i === index && branch ? (branchTone === 'danger' ? 'bg-danger-500' : 'bg-ember-400') : 'bg-slate-200'}`} />
        ))}
      </div>
      {!done && index < steps.length - 1 && (
        <p className="mt-1.5 text-xs text-slate-500">{t('life.next', { label: steps[index + 1] })}</p>
      )}
    </div>
    <ol className="hidden sm:flex sm:items-start" aria-label="Referral progress">
      {steps.map((label, i) => {
        const state = i < index || (done && !branch && i === index) ? 'done' : i === index ? (branch ? 'branch' : 'current') : 'todo';
        return (
          <li key={label} className="relative flex gap-3 pb-4 last:pb-0 sm:flex-1 sm:flex-col sm:items-center sm:gap-2 sm:pb-0 sm:text-center"
              aria-current={state === 'current' || state === 'branch' ? 'step' : undefined}>
            {i < steps.length - 1 && (
              <span aria-hidden className={`absolute left-[11px] top-6 h-[calc(100%-1.25rem)] w-0.5 sm:left-[calc(50%+14px)] sm:top-[11px] sm:h-0.5 sm:w-[calc(100%-28px)]
                ${i < index ? 'bg-brand-500' : 'bg-slate-200'}`} />
            )}
            <span className={`relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-white ring-4
              ${state === 'done' ? 'bg-brand-600 ring-brand-50'
                : state === 'current' ? 'bg-white ring-brand-100 shadow-[inset_0_0_0_2px_var(--color-brand-600)]'
                : state === 'branch' ? branchCls : 'bg-slate-200 ring-white'}`}>
              {state === 'done' && <Icon name="check" className="h-3.5 w-3.5" />}
              {state === 'current' && <span className="h-2 w-2 rounded-full bg-brand-600" />}
              {state === 'branch' && <Icon name="alert" className="h-3.5 w-3.5" />}
            </span>
            <span className="min-w-0 pt-0.5 sm:pt-0">
              <span className={`block text-[13px] leading-tight ${state === 'todo' ? 'text-slate-400' : 'font-semibold text-slate-800'}`}>{label}</span>
              {state === 'branch' && (
                <span className={`mt-0.5 block text-xs font-semibold ${branchTone === 'danger' ? 'text-danger-700' : 'text-ember-700'}`}>{branch}</span>
              )}
            </span>
          </li>
        );
      })}
    </ol>
    </>
  );
}

/* --------------------------------------------------------------- TIMELINE */
/** Vertical activity feed. items: [{ key, title, meta, note, time, icon?, tone? }] */
export function Timeline({ items }) {
  return (
    <ol className="relative space-y-4">
      {items.map((it, i) => (
        <li key={it.key ?? i} className="relative flex gap-3">
          {i < items.length - 1 && <span aria-hidden className="absolute left-[13px] top-7 h-[calc(100%-0.5rem)] w-px bg-brand-200" />}
          <span aria-hidden className={`relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ring-4 ring-white
            ${it.tone === 'danger' ? 'bg-danger-50 text-danger-600' : it.tone === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-brand-50 text-brand-600'}`}>
            <Icon name={it.icon || 'clock'} className="h-3.5 w-3.5" />
          </span>
          <div className="min-w-0 flex-1 pb-0.5">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3">
              <p className="text-sm font-semibold text-slate-900">{it.title}</p>
              {it.time && <time className="erl-nums text-xs text-slate-500" title={formatDual(it.time)}>{it.timeLabel}</time>}
            </div>
            {it.meta && <p className="text-xs text-slate-500">{it.meta}</p>}
            {it.note && <p className="mt-1 rounded-lg bg-slate-50 px-2.5 py-1.5 text-sm text-slate-600 ring-1 ring-slate-200/70">{it.note}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}

/* ------------------------------------------------------- DESCRIPTION LIST */
/** Label/value pairs. rows: [[label, value], …] — empty values are skipped. */
export function DescriptionList({ rows, cols = 2 }) {
  const shown = rows.filter(([, v]) => v !== null && v !== undefined && v !== '' && v !== false);
  if (!shown.length) return null;
  return (
    <dl className={`grid gap-x-6 gap-y-3 text-sm ${cols === 3 ? 'sm:grid-cols-3' : cols === 1 ? '' : 'sm:grid-cols-2'}`}>
      {shown.map(([label, value]) => (
        <div key={label} className="min-w-0">
          <dt className="text-xs font-medium text-slate-500">{label}</dt>
          <dd className="mt-0.5 break-words font-medium text-slate-900">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

/* -------------------------------------------------------------- VITAL TILE */
export function VitalTile({ label, value, unit, flag, flagLabel }) {
  const tone = flag ? 'bg-danger-50 ring-danger-200' : 'bg-slate-50 ring-slate-200/80';
  return (
    <div className={`rounded-xl px-3 py-2.5 ring-1 ${tone}`}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">{label}</p>
      <p className={`erl-nums mt-0.5 text-lg font-semibold leading-tight ${flag ? 'text-danger-700' : 'text-slate-900'}`}>
        {value}{unit && <span className="ml-1 text-xs font-medium text-slate-500">{unit}</span>}
      </p>
      {flag && (
        <p className="mt-0.5 flex items-center gap-1 text-[11px] font-semibold text-danger-700">
          <Icon name="alert" className="h-3 w-3" />{flagLabel}
        </p>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- KPI TILE */
export function KpiTile({ label, value, sub, icon, tone = 'brand', onClick, loading }) {
  const tones = {
    brand: 'text-brand-700 bg-brand-50 ring-brand-100',
    danger: 'text-danger-700 bg-danger-50 ring-danger-100',
    ember: 'text-ember-700 bg-ember-50 ring-ember-100',
    success: 'text-emerald-700 bg-emerald-50 ring-emerald-100',
    muted: 'text-slate-500 bg-slate-50 ring-slate-200',
  };
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag onClick={onClick} type={onClick ? 'button' : undefined}
         className={`flex w-full items-start gap-3 rounded-2xl bg-white p-4 text-left shadow-erl-sm ring-1 ring-brand-200/60
                     ${onClick ? 'transition hover:-translate-y-px hover:shadow-erl-md hover:ring-brand-300' : ''}`}>
      {icon && (
        <span aria-hidden className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ${tones[tone]}`}>
          <Icon name={icon} className="h-5 w-5" />
        </span>
      )}
      <span className="min-w-0">
        <span className="block text-xs font-medium text-slate-500">{label}</span>
        {loading ? <Skeleton className="mt-1.5 h-7 w-10" /> : (
          <span className={`erl-nums mt-0.5 block text-2xl font-semibold leading-tight tracking-[-0.03em] ${value > 0 && tone !== 'brand' && tone !== 'muted' ? tones[tone].split(' ')[0] : 'text-slate-900'}`}>{value}</span>
        )}
        {sub && <span className="mt-0.5 block text-xs text-slate-500">{sub}</span>}
      </span>
    </Tag>
  );
}
