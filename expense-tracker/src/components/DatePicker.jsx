import { useState, useEffect, useRef } from 'react';

const WEEK_DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const MONTHS_SHORT = MONTHS.map(m => m.slice(0, 3));

function parseISO(iso) {
  if (!iso) return null;
  const [y, m, d] = iso.split('-').map(Number);
  return { year: y, month: m, day: d };
}

function toISO(year, month, day) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export default function DatePicker({ value, onChange, hasError, accent = 'var(--accent)' }) {
  const [open, setOpen]         = useState(false);
  const [mode, setMode]         = useState('days'); // 'days' | 'months'
  const [hovered, setHovered]   = useState(null);
  const [hoveredM, setHoveredM] = useState(null);
  const ref = useRef(null);

  const now = new Date();
  const todayY = now.getFullYear();
  const todayM = now.getMonth() + 1;
  const todayD = now.getDate();

  const parsed = parseISO(value);
  const [viewYear, setViewYear]   = useState(parsed?.year  ?? todayY);
  const [viewMonth, setViewMonth] = useState(parsed?.month ?? todayM);

  // Sync view to selected value each time the calendar opens
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!open) { setMode('days'); return; }
    const p = parseISO(value);
    if (p) { setViewYear(p.year); setViewMonth(p.month); }
    else   { setViewYear(todayY); setViewMonth(todayM); }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return;
    function onMouse(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onMouse);
    return () => document.removeEventListener('mousedown', onMouse);
  }, [open]);

  // Intercept Escape in capture phase so the modal doesn't also close
  useEffect(() => {
    if (!open) return;
    function onKey(e) {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      if (mode === 'months') setMode('days');
      else setOpen(false);
    }
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [open, mode]);

  function prevPeriod() {
    if (mode === 'months') { setViewYear(y => y - 1); return; }
    if (viewMonth === 1) { setViewYear(y => y - 1); setViewMonth(12); }
    else setViewMonth(m => m - 1);
  }
  function nextPeriod() {
    if (mode === 'months') { setViewYear(y => y + 1); return; }
    if (viewMonth === 12) { setViewYear(y => y + 1); setViewMonth(1); }
    else setViewMonth(m => m + 1);
  }

  function pickMonth(m) {
    setViewMonth(m);
    setMode('days');
  }

  function buildCells() {
    const daysInMonth = new Date(viewYear, viewMonth, 0).getDate();
    const firstDow    = new Date(viewYear, viewMonth - 1, 1).getDay();
    const prevY       = viewMonth === 1 ? viewYear - 1 : viewYear;
    const prevM       = viewMonth === 1 ? 12 : viewMonth - 1;
    const daysInPrev  = new Date(prevY, prevM, 0).getDate();

    const cells = [];
    for (let i = firstDow - 1; i >= 0; i--)
      cells.push({ day: daysInPrev - i, type: 'prev' });
    for (let d = 1; d <= daysInMonth; d++)
      cells.push({ day: d, type: 'cur' });
    for (let d = 1; cells.length < 42; d++)
      cells.push({ day: d, type: 'next' });
    return cells;
  }

  const cells = buildCells();

  function displayValue() {
    if (!value) return 'Select a date…';
    const p = parseISO(value);
    if (!p) return 'Select a date…';
    return `${MONTHS[p.month - 1]} ${p.day}, ${p.year}`;
  }

  // ── shared header used in both modes ──────────────────────────────────
  const headerLabel = mode === 'months'
    ? String(viewYear)
    : `${MONTHS[viewMonth - 1]} ${viewYear}`;

  return (
    <div ref={ref} style={{ position: 'relative', width: '100%' }}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          fontFamily: 'inherit', fontSize: 15, width: '100%',
          background: 'var(--bg)',
          border: `1.5px solid ${hasError ? 'var(--danger)' : open ? accent : 'var(--border)'}`,
          borderRadius: 'var(--radius-sm)', padding: '11px 14px',
          color: value ? 'var(--text-primary)' : 'var(--text-tertiary)',
          outline: 'none', cursor: 'pointer', textAlign: 'left',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          transition: 'border-color .15s',
        }}
      >
        <span>{displayValue()}</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" strokeWidth="2"
          style={{ stroke: open ? accent : 'var(--text-secondary)', flexShrink: 0 }}>
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/>
          <line x1="8" y1="2" x2="8" y2="6"/>
          <line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
      </button>

      {/* Calendar popover */}
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0,
          width: 288, background: 'var(--surface)',
          borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-lg)', padding: 16, zIndex: 300,
          animation: 'calendarIn .2s cubic-bezier(.34,1.3,.64,1)',
          transformOrigin: 'top left',
        }}>

          {/* ── Header (shared) ── */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <button type="button" onClick={prevPeriod} style={cs.navBtn}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                strokeWidth="2.5" style={{ stroke: 'var(--text-primary)' }}>
                <polyline points="15 18 9 12 15 6"/>
              </svg>
            </button>

            {/* Clickable title toggles month-picker */}
            <button
              type="button"
              onClick={() => setMode(m => m === 'months' ? 'days' : 'months')}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontFamily: 'inherit', padding: '4px 8px',
                borderRadius: 'var(--radius-sm)',
                display: 'flex', alignItems: 'center', gap: 4,
              }}
            >
              <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.3px', color: 'var(--text-primary)' }}>
                {headerLabel}
              </span>
              {/* chevron indicator */}
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" strokeWidth="2.5"
                style={{
                  stroke: 'var(--text-secondary)', flexShrink: 0,
                  transform: mode === 'months' ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform .2s',
                }}>
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>

            <button type="button" onClick={nextPeriod} style={cs.navBtn}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                strokeWidth="2.5" style={{ stroke: 'var(--text-primary)' }}>
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>
          </div>

          {/* ── Month picker grid ── */}
          {mode === 'months' && (
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6,
              animation: 'calendarIn .15s cubic-bezier(.34,1.3,.64,1)',
            }}>
              {MONTHS_SHORT.map((name, i) => {
                const m        = i + 1;
                const isCurM   = m === viewMonth;
                const isTdyM   = viewYear === todayY && m === todayM;
                const isSelM   = parsed && viewYear === parsed.year && m === parsed.month;
                const isHovM   = hoveredM === m && !isSelM;
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => pickMonth(m)}
                    onMouseEnter={() => setHoveredM(m)}
                    onMouseLeave={() => setHoveredM(null)}
                    style={{
                      padding: '9px 4px', borderRadius: 'var(--radius-sm)',
                      border: isTdyM && !isSelM ? `1.5px solid ${accent}` : '1.5px solid transparent',
                      background: isSelM ? accent : isHovM ? 'var(--surface-2)' : 'transparent',
                      color: isSelM ? '#fff' : isCurM ? accent : 'var(--text-primary)',
                      fontSize: 13, fontWeight: isSelM || isCurM ? 600 : 400,
                      cursor: 'pointer', fontFamily: 'inherit',
                      transition: 'background .1s',
                      textAlign: 'center',
                    }}
                  >
                    {name}
                  </button>
                );
              })}
            </div>
          )}

          {/* ── Day grid ── */}
          {mode === 'days' && (
            <>
              {/* Weekday headers */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 4 }}>
                {WEEK_DAYS.map((d, i) => (
                  <div key={d} style={{
                    textAlign: 'center', fontSize: 11, fontWeight: 700,
                    letterSpacing: '0.3px', paddingBottom: 6,
                    color: i === 0 ? 'var(--danger)' : 'var(--text-tertiary)',
                  }}>{d}</div>
                ))}
              </div>

              {/* Day cells */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
                {cells.map((cell, i) => {
                  const isCur  = cell.type === 'cur';
                  const isSel  = isCur && parsed?.year === viewYear && parsed?.month === viewMonth && parsed?.day === cell.day;
                  const isTdy  = isCur && viewYear === todayY && viewMonth === todayM && cell.day === todayD;
                  const isSun  = i % 7 === 0;
                  const isHov  = hovered === i && isCur && !isSel;

                  return (
                    <button
                      key={i}
                      type="button"
                      disabled={!isCur}
                      onClick={() => { onChange(toISO(viewYear, viewMonth, cell.day)); setOpen(false); }}
                      onMouseEnter={() => isCur && setHovered(i)}
                      onMouseLeave={() => setHovered(null)}
                      style={{
                        width: '100%', aspectRatio: '1',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        borderRadius: '50%',
                        border: isTdy && !isSel ? `2px solid ${accent}` : '2px solid transparent',
                        background: isSel ? accent : isHov ? 'var(--surface-2)' : 'transparent',
                        color: isSel
                          ? '#fff'
                          : !isCur
                            ? 'var(--text-tertiary)'
                            : isSun
                              ? 'var(--danger)'
                              : 'var(--text-primary)',
                        fontSize: 14, fontWeight: isSel || isTdy ? 600 : 400,
                        cursor: isCur ? 'pointer' : 'default',
                        fontFamily: 'inherit',
                        opacity: isCur ? 1 : 0.22,
                        transition: 'background .1s',
                      }}
                    >
                      {cell.day}
                    </button>
                  );
                })}
              </div>

              {/* Today shortcut */}
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                <button
                  type="button"
                  onClick={() => { onChange(toISO(todayY, todayM, todayD)); setOpen(false); }}
                  style={{
                    width: '100%', padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: `1.5px solid ${accent}`,
                    background: 'transparent', color: accent,
                    fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  Today
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

const cs = {
  navBtn: {
    width: 32, height: 32, borderRadius: '50%', border: 'none',
    background: 'var(--bg)', cursor: 'pointer', fontFamily: 'inherit',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
};
