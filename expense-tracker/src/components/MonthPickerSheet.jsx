import { useState, useMemo, useRef } from 'react';
import { MONTH_SHORT, MONTH_NAMES } from '../utils/format';
import NavArrowButton from './NavArrowButton';

const now = new Date();
const CURRENT_YEAR = now.getFullYear();
const CURRENT_MONTH = now.getMonth();

/**
 * MonthPickerSheet — slide-up bottom sheet for selecting a month on mobile.
 *
 * Props:
 *   open           — boolean; whether the sheet is visible
 *   onClose        — called when the user dismisses without selecting
 *   onSelectMonth  — (year, monthIndex) => void; called on selection, then closes
 *   view           — current view (from parsePath)
 *   viewYear       — currently active year
 *   viewMonth      — currently active month index
 *   expenses       — flat array of all expenses (for data highlights)
 *   savings        — flat array of all savings (for data highlights)
 */
export default function MonthPickerSheet({
  open,
  onClose,
  onSelectMonth,
  view,
  viewYear,
  viewMonth,
  expenses,
  savings,
}) {
  const yearsWithData = useMemo(() => {
    const years = new Set([CURRENT_YEAR]);
    expenses.forEach(e => years.add(parseInt(e.date.split('-')[0])));
    savings.forEach(sv => years.add(parseInt(sv.date.split('-')[0])));
    return [...years].sort((a, b) => b - a);
  }, [expenses, savings]);

  const minYear = Math.min(...yearsWithData, CURRENT_YEAR - 1);
  const maxYear = CURRENT_YEAR + 1;

  // Derive the displayed year from the currently viewed year (if in month view).
  // The sheet is keyed by open state in App.jsx so this initializer re-runs on open.
  const [selectedYear, setSelectedYear] = useState(() =>
    !isNaN(viewYear) ? viewYear : CURRENT_YEAR
  );

  const activeMonths = useMemo(() => {
    const set = new Set();
    expenses.forEach(e => {
      const [y, m] = e.date.split('-');
      if (parseInt(y) === selectedYear) set.add(parseInt(m) - 1);
    });
    savings.forEach(sv => {
      const [y, m] = sv.date.split('-');
      if (parseInt(y) === selectedYear) set.add(parseInt(m) - 1);
    });
    return set;
  }, [expenses, savings, selectedYear]);

  // Swipe-down to dismiss
  const startYRef = useRef(null);

  function handleTouchStart(e) {
    startYRef.current = e.touches[0].clientY;
  }

  function handleTouchMove(e) {
    if (startYRef.current === null) return;
    const delta = e.touches[0].clientY - startYRef.current;
    if (delta > 60) {
      startYRef.current = null;
      onClose();
    }
  }

  function handleTouchEnd() {
    startYRef.current = null;
  }

  function handleSelect(monthIndex) {
    onSelectMonth(selectedYear, monthIndex);
    onClose();
  }

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div style={s.backdrop} onClick={onClose} />

      {/* Sheet */}
      <div
        style={s.sheet}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        role="dialog"
        aria-modal="true"
        aria-label="Select month"
      >
        {/* Drag handle affordance */}
        <div style={s.handleWrap}>
          <div style={s.handle} />
        </div>

        <div style={s.header}>
          <span style={s.title}>Select Month</span>
          <button style={s.closeBtn} onClick={onClose} type="button" aria-label="Close">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>

        {/* Year selector */}
        <div style={s.yearNav}>
          <NavArrowButton
            direction="left"
            size={40}
            iconSize={16}
            disabled={selectedYear <= minYear}
            onClick={() => setSelectedYear(y => y - 1)}
            title="Previous year"
          />
          <span style={s.yearLabel}>{selectedYear}</span>
          <NavArrowButton
            direction="right"
            size={40}
            iconSize={16}
            disabled={selectedYear >= maxYear}
            onClick={() => setSelectedYear(y => y + 1)}
            title="Next year"
          />
        </div>

        {/* 12-month grid — 3 columns, thumb-friendly 48px min height */}
        <div style={s.grid}>
          {MONTH_SHORT.map((name, i) => {
            const isActive = view === 'month' && viewYear === selectedYear && viewMonth === i;
            const isCurrMonth = selectedYear === CURRENT_YEAR && i === CURRENT_MONTH;
            const hasData = activeMonths.has(i);
            return (
              <button
                key={i}
                style={{
                  ...s.cell,
                  ...(!hasData ? s.cellDim : {}),
                  ...(isActive ? s.cellActive : {}),
                }}
                onClick={() => handleSelect(i)}
                title={MONTH_NAMES[i]}
                type="button"
              >
                <span style={s.cellName}>{name}</span>
                {isCurrMonth && <span style={s.dot} />}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}

const s = {
  backdrop: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.4)',
    backdropFilter: 'blur(4px)',
    WebkitBackdropFilter: 'blur(4px)',
    zIndex: 300,
    animation: 'fadeIn .2s ease',
  },
  sheet: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    background: 'var(--surface)',
    borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0',
    boxShadow: 'var(--shadow-lg)',
    zIndex: 301,
    paddingBottom: 'env(safe-area-inset-bottom)',
    animation: 'sheetSlideUp .28s cubic-bezier(0.32,0.72,0,1)',
  },
  handleWrap: {
    display: 'flex',
    justifyContent: 'center',
    paddingTop: 10,
    paddingBottom: 4,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    background: 'var(--border)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 20px 8px',
  },
  title: {
    fontSize: 17,
    fontWeight: 700,
    color: 'var(--text-primary)',
    letterSpacing: '-0.3px',
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: '50%',
    border: 'none',
    background: 'var(--bg)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--text-secondary)',
    fontFamily: 'inherit',
    WebkitTapHighlightColor: 'transparent',
  },
  yearNav: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    padding: '8px 20px 16px',
  },
  yearLabel: {
    fontSize: 20,
    fontWeight: 700,
    color: 'var(--text-primary)',
    letterSpacing: '-0.4px',
    minWidth: 60,
    textAlign: 'center',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 8,
    padding: '0 16px 24px',
  },
  cell: {
    // min 48px height for ≥ 44px touch target (including padding)
    minHeight: 52,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    border: '1.5px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    background: 'var(--bg)',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    fontFamily: 'inherit',
    padding: '8px 4px',
    transition: 'background 0.12s, color 0.12s',
    WebkitTapHighlightColor: 'transparent',
  },
  cellActive: {
    background: 'var(--accent)',
    color: '#fff',
    borderColor: 'var(--accent)',
    fontWeight: 700,
  },
  cellDim: {
    opacity: 0.38,
  },
  cellName: {
    fontSize: 14,
    fontWeight: 600,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: '50%',
    background: 'var(--success)',
    display: 'block',
  },
};
