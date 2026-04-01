import { useState, useMemo } from 'react';
import { MONTH_NAMES } from '../utils/format';

const now = new Date();
const CURRENT_YEAR = now.getFullYear();
const CURRENT_MONTH = now.getMonth(); // 0-indexed

export default function Sidebar({ view, viewYear, viewMonth, onHome, onSelectMonth, expenses, savings }) {
  const yearsWithData = useMemo(() => {
    const years = new Set([CURRENT_YEAR]);
    expenses.forEach(e => years.add(parseInt(e.date.split('-')[0])));
    savings.forEach(sv => years.add(parseInt(sv.date.split('-')[0])));
    return [...years].sort((a, b) => b - a);
  }, [expenses, savings]);

  const [expandedYears, setExpandedYears] = useState({ [CURRENT_YEAR]: true });

  function toggleYear(year) {
    setExpandedYears(prev => ({ ...prev, [year]: !prev[year] }));
  }

  return (
    <aside style={s.sidebar}>
      {/* Home / Annual summary */}
      <button
        style={{ ...s.homeBtn, ...(view === 'home' ? s.homeBtnActive : {}) }}
        onClick={onHome}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
          <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
        </svg>
        Resumen Anual
      </button>

      <div style={s.divider} />

      <p style={s.sectionLabel}>Meses</p>

      {yearsWithData.map(year => {
        const isExpanded = !!expandedYears[year];
        const isCurrYear = year === CURRENT_YEAR;
        const monthCount = isCurrYear ? CURRENT_MONTH + 1 : 12;

        return (
          <div key={year}>
            <button style={s.yearBtn} onClick={() => toggleYear(year)}>
              <span style={s.yearLabel}>{year}</span>
              <span style={s.chevron}>{isExpanded ? '▾' : '▸'}</span>
            </button>

            {isExpanded && (
              <div>
                {Array.from({ length: monthCount }, (_, i) => {
                  const isActive = view === 'month' && viewYear === year && viewMonth === i;
                  const isCurrMonth = isCurrYear && i === CURRENT_MONTH;
                  return (
                    <button
                      key={i}
                      style={{ ...s.monthBtn, ...(isActive ? s.monthBtnActive : {}) }}
                      onClick={() => onSelectMonth(year, i)}
                    >
                      <span>{MONTH_NAMES[i]}</span>
                      {isCurrMonth && <span style={s.dot} />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </aside>
  );
}

const s = {
  sidebar: {
    width: 200,
    flexShrink: 0,
    borderRight: '1px solid var(--border)',
    background: 'var(--surface)',
    position: 'sticky',
    top: 64,
    height: 'calc(100vh - 64px)',
    overflowY: 'auto',
    padding: '12px 8px 24px',
    display: 'flex',
    flexDirection: 'column',
    gap: 1,
  },
  homeBtn: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 12px',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    background: 'transparent',
    color: 'var(--text-primary)',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
    textAlign: 'left',
    transition: 'background 0.12s',
  },
  homeBtnActive: {
    background: 'var(--accent-light)',
    color: 'var(--accent)',
  },
  divider: {
    height: 1,
    background: 'var(--border)',
    margin: '8px 4px',
    flexShrink: 0,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.8px',
    color: 'var(--text-tertiary)',
    padding: '0 12px',
    margin: '4px 0 6px',
  },
  yearBtn: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '7px 12px',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    background: 'transparent',
    color: 'var(--text-secondary)',
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'background 0.12s',
  },
  yearLabel: {
    letterSpacing: '0.2px',
  },
  chevron: {
    fontSize: 11,
    color: 'var(--text-tertiary)',
  },
  monthBtn: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '7px 12px 7px 22px',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    background: 'transparent',
    color: 'var(--text-secondary)',
    fontSize: 13,
    fontWeight: 400,
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'background 0.12s',
  },
  monthBtnActive: {
    background: 'var(--accent)',
    color: '#fff',
    fontWeight: 600,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: '50%',
    background: 'var(--success)',
    display: 'inline-block',
    flexShrink: 0,
  },
};
