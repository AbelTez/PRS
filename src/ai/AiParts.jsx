import React from 'react';
import { useT } from '../i18n';
import { Icon } from '../brand';

/* Shared AI presentation: one sparkle language, one "suggestion" frame. */

/** The violet accent marks AI output everywhere, so it is never mistaken for system data. */
export function AiButton({ children, busy, onClick, disabled, className = '', size = 'md', type = 'button' }) {
  const t = useT();
  const sz = size === 'sm' ? 'min-h-[34px] px-2.5 text-xs' : 'min-h-[40px] px-3.5 text-sm';
  return (
    <button
      type={type} onClick={onClick} disabled={disabled || busy}
      className={`inline-flex items-center justify-center gap-1.5 rounded-xl bg-violet-50 font-semibold text-violet-700 ring-1 ring-violet-200
                  transition hover:bg-violet-100 hover:text-violet-800 disabled:cursor-not-allowed disabled:opacity-60 ${sz} ${className}`}
    >
      <Icon name={busy ? 'loader' : 'sparkle'} className={`h-4 w-4 ${busy ? 'animate-spin' : ''}`} />
      {busy ? t('ai.thinking') : children}
    </button>
  );
}

/** Frame for any AI result: label, disclaimer, optional dismiss. */
export function AiCard({ title, children, onClose, footer, className = '' }) {
  const t = useT();
  return (
    <section className={`overflow-hidden rounded-2xl bg-white shadow-erl-sm ring-1 ring-violet-200 animate-erl-rise ${className}`} aria-live="polite">
      <header className="flex items-start justify-between gap-3 border-b border-violet-100 bg-violet-50/70 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <Icon name="sparkle" className="h-4.5 w-4.5 shrink-0 text-violet-600" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-violet-900">{title || t('ai.suggestion')}</p>
            <p className="text-[11px] text-violet-700/80">{t('ai.disclaimer')}</p>
          </div>
        </div>
        {onClose && (
          <button type="button" onClick={onClose} aria-label={t('ai.dismiss')}
                  className="-m-1 shrink-0 rounded-lg p-1 text-violet-400 hover:bg-violet-100 hover:text-violet-700">
            <Icon name="x" className="h-4 w-4" />
          </button>
        )}
      </header>
      <div className="space-y-3 p-4 text-sm">{children}</div>
      {footer && <footer className="border-t border-violet-100 bg-violet-50/40 px-4 py-2.5">{footer}</footer>}
    </section>
  );
}

/** Small inline action used inside AI cards ("Use this reason", "Apply"). */
export function AiApply({ children, onClick, done }) {
  return (
    <button type="button" onClick={onClick} disabled={done}
            className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold ring-1 transition
              ${done ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-white text-violet-700 ring-violet-200 hover:bg-violet-50'}`}>
      <Icon name={done ? 'check' : 'plus'} className="h-3.5 w-3.5" />{children}
    </button>
  );
}

/** Compact error line for AI calls; the form keeps working without AI. */
export function AiError({ error }) {
  const t = useT();
  if (!error) return null;
  const msg = typeof error.detail === 'string' ? error.detail : error.detail?.message || error.message;
  return (
    <p role="alert" className="flex items-start gap-1.5 rounded-lg bg-ember-50 px-3 py-2 text-xs font-medium text-ember-800 ring-1 ring-ember-200">
      <Icon name="info" className="mt-px h-3.5 w-3.5 shrink-0" />
      <span>{msg || t('ai.error')} {t('ai.manual')}</span>
    </p>
  );
}

/**
 * Tiny, safe formatter for model text: paragraphs, "- " / "• " / "* " / "1." bullets
 * and **bold**. Builds React nodes — never injects HTML.
 */
export function AiText({ text, className = '' }) {
  const blocks = String(text || '').replace(/\r/g, '').split(/\n{2,}/);
  const inline = (s, k) => s.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**')
      ? <strong key={`${k}-${i}`} className="font-semibold text-slate-900">{part.slice(2, -2)}</strong>
      : <React.Fragment key={`${k}-${i}`}>{part.replace(/^#+\s*/, '')}</React.Fragment>);
  return (
    <div className={`space-y-2 leading-relaxed ${className}`}>
      {blocks.map((b, bi) => {
        // Within a paragraph, group consecutive bullet lines into a list and keep other lines as text.
        const bullet = /^\s*(?:[-•*]|\d+[.)])\s+/;
        const groups = [];
        b.split('\n').filter((l) => l.trim()).forEach((l) => {
          const isBullet = bullet.test(l);
          const last = groups[groups.length - 1];
          if (last && last.list === isBullet) last.lines.push(l); else groups.push({ list: isBullet, lines: [l] });
        });
        return (
          <div key={bi} className="space-y-1.5">
            {groups.map((g, gi) => g.list ? (
              <ul key={gi} className="space-y-1">
                {g.lines.map((l, li) => (
                  <li key={li} className="flex gap-2">
                    <span aria-hidden className="mt-[0.6em] h-1.5 w-1.5 shrink-0 rounded-full bg-violet-400" />
                    <span>{inline(l.replace(bullet, ''), `${bi}-${gi}-${li}`)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p key={gi}>{g.lines.map((l, li) => <React.Fragment key={li}>{li > 0 && <br />}{inline(l, `${bi}-${gi}-${li}`)}</React.Fragment>)}</p>
            ))}
          </div>
        );
      })}
    </div>
  );
}
