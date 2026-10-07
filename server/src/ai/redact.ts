/**
 * Strips direct identifiers from free text before it leaves the server.
 * Structured payloads never include names; this sweep catches what users
 * type into free-text boxes (phone numbers, e-mail, long ID numbers).
 */
const PATTERNS: [RegExp, string][] = [
  [/[\w.+-]+@[\w-]+\.[\w.-]+/g, '[email]'],
  // Ethiopian and international phone numbers: +2519…, 09…, 07…, with spaces/dashes
  [/(?:\+?251[\s-]?|\b0)(?:9|7|1)\d(?:[\s-]?\d){7}\b/g, '[phone]'],
  [/\+\d[\d\s-]{8,}\d/g, '[phone]'],
  // Fayda / MRN-like long digit runs
  [/\b\d{9,}\b/g, '[id]'],
];

export function redact(text: unknown, maxLen = 4000): string {
  let s = typeof text === 'string' || typeof text === 'number' ? String(text) : '';
  for (const [re, rep] of PATTERNS) s = s.replace(re, rep);
  return s.slice(0, maxLen);
}

/** Removes every occurrence of known names (e.g. the patient's) from free text. */
export function redactNames(text: string, names: (string | null | undefined)[]): string {
  let s = text;
  for (const n of names) {
    const v = String(n || '').trim();
    if (v.length < 2) continue;
    s = s.replace(new RegExp(v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '[name]');
  }
  return s;
}
