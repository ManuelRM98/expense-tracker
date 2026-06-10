export const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
];
export const MONTH_SHORT = [
  'Jan','Feb','Mar','Apr','May','Jun',
  'Jul','Aug','Sep','Oct','Nov','Dec'
];

export function fmtCOP(n) {
  return '$ ' + Number(n).toLocaleString('es-CO');
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
