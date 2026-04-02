import { useState, useMemo } from 'react';
import { MONTH_NAMES } from '../utils/format';

const now = new Date();
const CURRENT_YEAR = now.getFullYear();
const CURRENT_MONTH = now.getMonth(); // 0-indexed

export default function Sidebar({ view, viewYear, viewMonth, onHome, onSelectMonth, expenses, savings, onOpenSettings }) {
  const yearsWithData = useMemo(() => {
    const years = new Set([CURRENT_YEAR]);
    expenses.forEach(e => years.add(parseInt(e.date.split('-')[0])));
    savings.forEach(sv => years.add(parseInt(sv.date.split('-')[0])));
    return [...years].sort((a, b) => b - a);
  }, [expenses, savings]);

  const [expandedYears, setExpandedYears] = useState({ [CURRENT_YEAR]: true });
  const [collapsed, setCollapsed] = useState(false);

  function toggleYear(year) {
    setExpandedYears(prev => ({ ...prev, [year]: !prev[year] }));
  }

  return (
    <aside style={{ ...s.sidebar, width: collapsed ? 52 : 200 }}>
      {/* Hamburger toggle */}
      <button style={s.hamburger} onClick={() => setCollapsed(c => !c)} title={collapsed ? 'Expandir menú' : 'Colapsar menú'}>
        <span style={s.bar} />
        <span style={s.bar} />
        <span style={s.bar} />
      </button>

      {!collapsed && (
        <>
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

          <div style={s.monthsScroll}>
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
          </div>

          {/* Bottom action buttons */}
          <div style={s.bottomActions}>
            <div style={s.divider} />
            <button style={{ ...s.actionBtn, ...(view === 'settings' ? s.actionBtnActive : {}) }} onClick={onOpenSettings} title="Settings">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
                <path d="M19.14 12.94c.04-.3.06-.61.06-.94s-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.49.49 0 0 0-.59-.22l-2.39.96a7.02 7.02 0 0 0-1.62-.94l-.36-2.54a.484.484 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.49.49 0 0 0-.59.22L2.74 8.87a.48.48 0 0 0 .12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32a.49.49 0 0 0-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
              </svg>
              Settings
            </button>
          </div>
        </>
      )}
    </aside>
  );
}

const s = {
  sidebar: {
    flexShrink: 0,
    borderRight: '1px solid var(--border)',
    background: 'var(--surface)',
    position: 'sticky',
    top: 64,
    height: 'calc(100vh - 64px)',
    padding: '8px 6px',
    display: 'flex',
    flexDirection: 'column',
    gap: 1,
    transition: 'width 0.2s ease',
    overflow: 'hidden',
  },
  hamburger: {
    width: 36,
    height: 36,
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    background: 'transparent',
    cursor: 'pointer',
    padding: 0,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  bar: {
    display: 'block',
    width: 18,
    height: 2,
    borderRadius: 2,
    background: 'var(--text-secondary)',
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
    whiteSpace: 'nowrap',
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
    whiteSpace: 'nowrap',
  },
  monthsScroll: {
    flex: 1,
    overflowY: 'auto',
    overflowX: 'hidden',
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
    whiteSpace: 'nowrap',
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
    whiteSpace: 'nowrap',
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
  bottomActions: {
    flexShrink: 0,
  },
  actionBtn: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '9px 12px',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    background: 'transparent',
    color: 'var(--text-secondary)',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    fontFamily: 'inherit',
    textAlign: 'left',
    transition: 'background 0.12s',
    whiteSpace: 'nowrap',
  },
  actionBtnActive: {
    background: 'var(--accent-light)',
    color: 'var(--accent)',
  },
};
