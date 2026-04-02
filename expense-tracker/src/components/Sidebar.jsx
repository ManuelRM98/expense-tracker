import { useState, useMemo } from 'react';
import { MONTH_NAMES } from '../utils/format';

const now = new Date();
const CURRENT_YEAR = now.getFullYear();
const CURRENT_MONTH = now.getMonth(); // 0-indexed

export default function Sidebar({ view, viewYear, viewMonth, onHome, onSelectMonth, expenses, savings, darkMode, onToggleDark, onOpenPermanent }) {
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
            <button style={s.actionBtn} onClick={onOpenPermanent} title="Permanent Fixed Costs">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
                <path d="M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z"/>
              </svg>
              Permanent Fixed Costs
            </button>
            <button style={s.actionBtn} onClick={onToggleDark} title={darkMode ? 'Modo claro' : 'Modo oscuro'}>
              {darkMode ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
                  <path d="M12 7a5 5 0 1 0 0 10A5 5 0 0 0 12 7zm0-5a1 1 0 0 1 1 1v1a1 1 0 0 1-2 0V3a1 1 0 0 1 1-1zm0 18a1 1 0 0 1-1-1v-1a1 1 0 0 1 2 0v1a1 1 0 0 1-1 1zM4.22 5.64a1 1 0 0 1 1.42-1.42l.7.71a1 1 0 0 1-1.41 1.41l-.71-.7zm13.44 12.72a1 1 0 0 1 1.41-1.41l.71.7a1 1 0 1 1-1.42 1.42l-.7-.71zM3 12a1 1 0 0 1 1-1h1a1 1 0 0 1 0 2H4a1 1 0 0 1-1-1zm16 0a1 1 0 0 1 1-1h1a1 1 0 0 1 0 2h-1a1 1 0 0 1-1-1zM4.22 18.36l.71-.7a1 1 0 1 1 1.41 1.41l-.7.71a1 1 0 0 1-1.42-1.42zM17.66 5.64l.7-.71a1 1 0 1 1 1.42 1.42l-.71.7a1 1 0 0 1-1.41-1.41z"/>
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                </svg>
              )}
              {darkMode ? 'Modo claro' : 'Modo oscuro'}
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
};
