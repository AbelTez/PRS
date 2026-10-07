import React from 'react';

/* ============================================================================
   BRAND PRESENTATION LAYER
   ----------------------------------------------------------------------------
   Purely visual components that carry the EthioReferral Linkage identity.
   Nothing in this file talks to the API, holds domain state, or changes how
   anything behaves — it only decides how the interface looks.

   ICONOGRAPHY
   All line icons are drawn on a 24x24 grid with a 1.75 stroke so the whole
   product shares one icon weight, and every one of them is teal, the way the
   logo is.
   ========================================================================== */

/* ------------------------------------------------------------------ LOGO */

/**
 * The EthioReferral Linkage logo, served from /public/logo.jpg.
 *
 * The source file is 400x400, so it is a square emblem. It is rendered with
 * `object-contain` inside a square box: it is never stretched, never
 * recoloured, and never dropped into an unrelated shape. Size changes only.
 */
export function LogoMark({ className = 'h-10 w-10', rounded = 'rounded-xl' }) {
  return (
    <img
      src="/logo.jpg"
      alt="EthioReferral Linkage"
      width="400"
      height="400"
      className={`${className} ${rounded} bg-white object-contain shadow-erl-xs ring-1 ring-brand-200/70`}
      draggable="false"
    />
  );
}

/** Logo + wordmark, used in every header, auth screen and dashboard. */
export function BrandLockup({
  tone = 'dark',
  markClass = 'h-10 w-10',
  className = '',
  subtitle = 'የሪፈራል ትስስር · Federal three-tier network',
}) {
  const light = tone === 'light';
  return (
    <span className={`flex items-center gap-2.5 ${className}`}>
      <LogoMark className={markClass} />
      <span className="min-w-0 leading-tight">
        <span
          className={`block truncate text-[15px] font-semibold tracking-[-0.02em] sm:text-base ${
            light ? 'text-white' : 'text-slate-900'
          }`}
        >
          Ethio Referral Linkage
        </span>
        <span
          className={`block truncate text-[11px] font-medium ${
            light ? 'text-brand-100' : 'text-slate-500'
          }`}
        >
          {subtitle}
        </span>
      </span>
    </span>
  );
}

/* -------------------------------------------------------------- ICON SET */

const svgBase = {
  width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none',
  stroke: 'currentColor', strokeWidth: 1.75,
  strokeLinecap: 'round', strokeLinejoin: 'round',
  'aria-hidden': 'true', focusable: 'false',
};

const PATHS = {
  stethoscope: (
    <>
      <path d="M5 3v5a4 4 0 0 0 8 0V3" />
      <path d="M4 3h2M12 3h2" />
      <path d="M9 12v2a5 5 0 0 0 5 5h1" />
      <circle cx="18" cy="17" r="3" />
    </>
  ),
  nurse: (
    <>
      <path d="M12 3 4.5 6.5v5c0 4.4 3.1 8.2 7.5 9.5 4.4-1.3 7.5-5.1 7.5-9.5v-5L12 3Z" />
      <path d="M12 8v5M9.5 10.5h5" />
    </>
  ),
  monitor: (
    <>
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M8 20h8M12 16v4" />
      <path d="M6.5 11.5h2l1.2-2.5 1.6 4 1.2-1.5h2" />
    </>
  ),
  people: (
    <>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5" />
      <path d="M16 5.4A3.2 3.2 0 0 1 16 11M17.5 14.9c2.1.7 3.5 2.5 3.5 5.1" />
    </>
  ),
  building: (
    <>
      <path d="M3 21h18" />
      <path d="M5 21V5.5A1.5 1.5 0 0 1 6.5 4h7A1.5 1.5 0 0 1 15 5.5V21" />
      <path d="M15 10h3.5A1.5 1.5 0 0 1 20 11.5V21" />
      <path d="M8 8h4M8 12h4M8 16h4" />
      <path d="M17.5 14h.01M17.5 17.5h.01" />
    </>
  ),
  handHeart: (
    <>
      <path d="M11.5 8.2 12.9 9.6a1.7 1.7 0 0 0 2.4-2.4l-2.6-2.5a3 3 0 0 0-4.2 0L4 9.2v5.3c0 .9.7 1.6 1.6 1.6H11" />
      <path d="M20.8 14.4c-.6-1.1-2.1-1.2-2.7-.2-.6-1-2.1-.9-2.7.2-.5 1 .1 2.2 1.4 3l1.3.8 1.3-.8c1.3-.8 1.9-2 1.4-3Z" />
    </>
  ),
  bureau: (
    <>
      <path d="M3 9.5 12 4l9 5.5" />
      <path d="M5 10v8M9.7 10v8M14.3 10v8M19 10v8M3 20h18" />
    </>
  ),
  ambulance: (
    <>
      <path d="M2 16V7a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v9" />
      <path d="M13 10h3.6a1 1 0 0 1 .8.4L21 14v2" />
      <path d="M2 16h2m4 0h2m4 0h5" />
      <path d="M7 8v4M5 10h4" />
      <circle cx="6.5" cy="16.5" r="1.8" />
      <circle cx="17.5" cy="16.5" r="1.8" />
    </>
  ),
  route: (
    <>
      <circle cx="6" cy="6" r="2.5" />
      <circle cx="18" cy="18" r="2.5" />
      <path d="M8.5 6H15a3.5 3.5 0 0 1 0 7H9a3.5 3.5 0 0 0 0 7h6.5" />
    </>
  ),
  bed: (
    <>
      <path d="M3 7v11M3 18h18" />
      <path d="M3 13h18v5" />
      <path d="M7 13V9.5A1.5 1.5 0 0 1 8.5 8H12a2 2 0 0 1 2 2v3" />
      <circle cx="7.5" cy="11" r="0" />
    </>
  ),
  pin: (
    <>
      <path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11Z" />
      <circle cx="12" cy="10" r="2.6" />
    </>
  ),
  doc: (
    <>
      <path d="M13.5 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8.5L13.5 3Z" />
      <path d="M13.5 3v5.5H19" />
      <path d="M8.5 13h7M8.5 16.5h4.5" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3 4.5 6.5v5c0 4.4 3.1 8.2 7.5 9.5 4.4-1.3 7.5-5.1 7.5-9.5v-5L12 3Z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  phone: (
    <>
      <path d="M6.5 3.5h2l1.5 4-2 1.5a11 11 0 0 0 5 5l1.5-2 4 1.5v2a2 2 0 0 1-2 2A15.5 15.5 0 0 1 4.5 5.5a2 2 0 0 1 2-2Z" />
    </>
  ),
  send: (
    <>
      <path d="M20.5 3.5 10.8 13.2" />
      <path d="M20.5 3.5 14.4 20.5l-3.6-7.3-7.3-3.6 17-6.1Z" />
    </>
  ),
  inbox: (
    <>
      <path d="M3 13h5l1.5 3h5L16 13h5" />
      <path d="M4.6 5.6 3 13v5a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5l-1.6-7.4A2 2 0 0 0 17.5 4h-11a2 2 0 0 0-1.9 1.6Z" />
    </>
  ),
  gauge: (
    <>
      <path d="M4 18a9 9 0 1 1 16 0" />
      <path d="m12 13 4-3.5" />
      <circle cx="12" cy="14" r="1.6" />
    </>
  ),
  clip: (
    <>
      <path d="M9 4h6a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" />
      <path d="M9.5 3h5M9.5 9h5M9.5 13h3" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 1.8" />
    </>
  ),
  sparkle: (
    <>
      <path d="m12 3 1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3Z" />
      <path d="M18.5 16.5 19 18l1.5.5-1.5.5-.5 1.5-.5-1.5L16.5 18l1.5-.5.5-1.5Z" />
    </>
  ),
};

export function Icon({ name, className = 'h-5 w-5', ...rest }) {
  const path = PATHS[name];
  if (!path) return null;
  return (
    <svg {...svgBase} {...rest} className={className}>
      {path}
    </svg>
  );
}

/** The same icon inside a soft teal tile — the default lead element for a card. */
export function IconTile({ name, className = 'h-5 w-5', box = 'h-10 w-10', tone = 'soft' }) {
  const tones = {
    soft: 'bg-brand-50 text-brand-600 ring-1 ring-brand-100',
    solid: 'bg-brand-600 text-white ring-1 ring-brand-700',
    tint: 'bg-brand-100 text-brand-700 ring-1 ring-brand-200',
    ghost: 'bg-white text-brand-500 ring-1 ring-brand-200',
  };
  return (
    <span className={`inline-flex shrink-0 items-center justify-center rounded-xl ${box} ${tones[tone]}`}>
      <Icon name={name} className={className} />
    </span>
  );
}

/* ================================================================= PHOTOS */

/**
 * A photography slot.
 *
 * Drop a licensed Ethiopian healthcare photo into `web/public/img/` under the
 * given `src` name and it appears automatically. If the file is absent the slot
 * renders the brand's own soft panel instead — so no page ever shows a broken
 * image, and nothing here downloads or references third-party assets.
 *
 * Purely presentational: no data, no state beyond "did the file load".
 */
export function Photo({ src, alt, className = '', imgClassName = '', priority }) {
  const [failed, setFailed] = React.useState(false);
  if (failed) {
    return (
      <div className={`erl-photo-skeleton relative overflow-hidden ${className}`} role="img" aria-label={alt}>
        <ConnectionField className="absolute inset-0 h-full w-full opacity-70" />
        <LogoMark className="absolute bottom-4 left-4 h-8 w-8 opacity-90" />
        <p className="absolute bottom-4 right-4 max-w-[60%] text-right text-[11px] font-medium leading-snug text-slate-600">
          Connecting care across Ethiopian health facilities
        </p>
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      onError={() => setFailed(true)}
      className={`object-cover ${className} ${imgClassName}`}
    />
  );
}

/* ==================================================== CONNECTION LANGUAGE */

/**
 * The quiet decorative layer: thin teal lines joining small nodes.
 * Absolutely positioned by the caller, `aria-hidden`, pointer-events off, so it
 * is pure ornament behind content.
 */
export function ConnectionField({ className = '', nodes = 7, seed = 1 }) {
  const pts = React.useMemo(() => {
    // deterministic pseudo-random so the ornament never re-shuffles on render
    let s = seed * 9301 + 49297;
    const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
    return Array.from({ length: nodes }, (_, i) => ({
      i,
      x: 6 + rnd() * 88,
      y: 8 + rnd() * 84,
      r: 1.6 + rnd() * 2.4,
    }));
  }, [nodes, seed]);

  return (
    <svg
      className={`pointer-events-none select-none ${className}`}
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      {pts.slice(0, -1).map((p, k) => {
        const q = pts[k + 1];
        return (
          <line
            key={`l${p.i}`}
            x1={p.x} y1={p.y} x2={q.x} y2={q.y}
            stroke="var(--color-brand-400)"
            strokeWidth="0.35"
            strokeOpacity="0.5"
          />
        );
      })}
      {pts.map((p) => (
        <circle
          key={`n${p.i}`}
          cx={p.x} cy={p.y} r={p.r}
          fill="var(--color-brand-400)"
          fillOpacity="0.45"
        />
      ))}
    </svg>
  );
}

/**
 * A single travelling node along a hairline path — the referral "in motion"
 * hint. Decorative, slow, and disabled under prefers-reduced-motion.
 */
export function FlowPulse({ className = '' }) {
  return (
    <svg
      className={`pointer-events-none select-none ${className}`}
      viewBox="0 0 120 8"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M2 4h116"
        stroke="var(--color-brand-300)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M2 4h116"
        stroke="var(--color-brand-500)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeDasharray="6 38"
        className="motion-safe:animate-erl-flow"
      />
    </svg>
  );
}

/**
 * Renders `steps` as connected nodes joined by teal rails.
 * Purely presentational — it draws whatever titles and descriptions it is given
 * and never adds, removes or reorders them.
 */
export function FlowSteps({ steps, className = '' }) {
  return (
    <ol className={`grid gap-4 sm:grid-cols-2 lg:grid-cols-4 ${className}`}>
      {steps.map(([title, body], i) => (
        <li key={title} className="relative flex flex-col">
          {/* connector out of this node, hidden on the last one and on mobile */}
          {i < steps.length - 1 && (
            <span
              aria-hidden="true"
              className="erl-rail absolute left-[2.05rem] right-[-1rem] top-[1.05rem] hidden h-[2px] lg:block"
            />
          )}
          <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-brand-500 text-sm font-bold text-white shadow-erl-sm ring-4 ring-brand-100">
            {i + 1}
          </span>
          <h3 className="mt-3 text-[15px] font-semibold text-slate-900">{title}</h3>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{body}</p>
        </li>
      ))}
    </ol>
  );
}

/* ============================================================ PAGE FURNITURE */

/** Eyebrow + title + optional lede. One heading rhythm for every screen. */
export function PageHead({ eyebrow, title, lede, actions, className = '' }) {
  return (
    <header className={`flex flex-wrap items-start justify-between gap-3 ${className}`}>
      <div className="min-w-0">
        {eyebrow && (
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-600">{eyebrow}</p>
        )}
        <h1 className="mt-1 text-2xl font-semibold tracking-[-0.025em] text-slate-900 sm:text-[28px]">
          {title}
        </h1>
        {lede && <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-slate-600">{lede}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </header>
  );
}

/** Small caps label used above groups of fields and list items. */
export function SectionLabel({ children, className = '' }) {
  return (
    <p className={`text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 ${className}`}>
      {children}
    </p>
  );
}
