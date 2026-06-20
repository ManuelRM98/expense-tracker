export const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
];
export const MONTH_SHORT = [
  'Jan','Feb','Mar','Apr','May','Jun',
  'Jul','Aug','Sep','Oct','Nov','Dec'
];

export function fmtCOP(n) {
  // Show cents when present, but keep whole amounts ungrouped-clean ("$ 1.000.000").
  return '$ ' + Number(n).toLocaleString('es-CO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

// ── Money input helpers (es-CO: "." thousands, "," decimal) ────────────────────
// Replaces the old `replace(/\D/g, '')` + parseInt pattern so amounts can carry
// up to 2 decimals (e.g. the user types "173,85").

/**
 * Format a raw input string for display while typing. Keeps digits, groups the
 * integer part with "." and allows a single "," decimal separator capped at 2
 * places. A pasted "." decimal is accepted (the first separator wins).
 * Examples: "1000000" → "1.000.000", "1000000,5" → "1.000.000,5", "173.85" → "173,85"
 */
export function formatAmountInput(raw) {
  if (raw == null) return '';
  let s = String(raw).replace(/[^\d.,]/g, '');
  // Normalise the decimal separator to ",". The first "." or "," is the decimal
  // point; any later separators are dropped.
  const firstSep = s.search(/[.,]/);
  let intPart = firstSep === -1 ? s : s.slice(0, firstSep);
  let decPart = firstSep === -1 ? null : s.slice(firstSep + 1).replace(/[.,]/g, '');
  intPart = intPart.replace(/\D/g, '');
  const grouped = intPart === '' ? '' : Number(intPart).toLocaleString('es-CO');
  if (decPart == null) return grouped;
  decPart = decPart.slice(0, 2);
  return `${grouped},${decPart}`;
}

/**
 * Parse a displayed/raw amount string to a Number. Strips "." thousands,
 * converts "," → ".", then parseFloat. Returns NaN for empty/invalid input so
 * existing `if (!amount)` guards keep working.
 */
export function parseAmount(str) {
  if (str == null) return NaN;
  const normalised = String(str).replace(/\./g, '').replace(',', '.').replace(/[^\d.]/g, '');
  if (normalised === '' || normalised === '.') return NaN;
  return parseFloat(normalised);
}

export function fmtDate(iso) {
  // QUAL-06: guard against null/undefined/malformed input
  if (!iso || typeof iso !== 'string') return '';
  const parts = iso.split('-');
  if (parts.length < 3) return iso; // return raw string rather than crashing
  const [y, m, d] = parts;
  const mIdx = parseInt(m, 10) - 1;
  const day = parseInt(d, 10);
  if (isNaN(mIdx) || mIdx < 0 || mIdx > 11 || isNaN(day)) return iso;
  return `${MONTH_SHORT[mIdx]} ${day}, ${y}`;
}

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export function todayISO() {
  return new Date().toISOString().split('T')[0];
}
