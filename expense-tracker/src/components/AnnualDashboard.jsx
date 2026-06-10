import { useMemo } from 'react';
import { fmtCOP, MONTH_NAMES, MONTH_SHORT } from '../utils/format';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';

const COLORS = ['#007aff', '#34c759', '#ff9500', '#ff3b30', '#af52de', '#5ac8fa', '#ffcc00'];

const now = new Date();
const CURRENT_YEAR = now.getFullYear();
const CURRENT_MONTH = now.getMonth(); // 0-indexed

export default function AnnualDashboard({ year, expenses, savings, getIncome, onPrevYear, onNextYear }) {
  const isCurrentYear = year === CURRENT_YEAR;
  const maxMonthIdx = isCurrentYear ? CURRENT_MONTH : 11;

  // BUG-06: filter by effective month (billingMonth ?? date[:7]) to match monthly view
  const yearExpenses = useMemo(() =>
    expenses.filter(e => {
      const effectiveMonth = e.billingMonth ?? e.date.substring(0, 7);
      return parseInt(effectiveMonth.split('-')[0]) === year;
    }),
    [expenses, year]
  );

  const yearSavings = useMemo(() =>
    savings.filter(sv => parseInt(sv.date.split('-')[0]) === year),
    [savings, year]
  );

  const monthlyData = useMemo(() =>
    Array.from({ length: maxMonthIdx + 1 }, (_, i) => {
      const m = i + 1;
      const monthKey = `${year}-${String(m).padStart(2, '0')}`;
      // BUG-06: group by effective month (billingMonth ?? date[:7])
      const mExp = yearExpenses.filter(e => {
        const effectiveMonth = e.billingMonth ?? e.date.substring(0, 7);
        return parseInt(effectiveMonth.split('-')[1]) === m;
      });
      const mSav = yearSavings.filter(sv => parseInt(sv.date.split('-')[1]) === m);
      return {
        month: MONTH_SHORT[i],
        gastos: mExp.reduce((s, e) => s + e.price, 0),
        ahorros: mSav.reduce((s, sv) => s + sv.price, 0),
        income: getIncome(monthKey),
      };
    }),
    [yearExpenses, yearSavings, getIncome, year, maxMonthIdx]
  );

  const totalExp = yearExpenses.reduce((s, e) => s + e.price, 0);
  const totalSav = yearSavings.reduce((s, sv) => s + sv.price, 0);
  const totalIncome = monthlyData.reduce((s, m) => s + m.income, 0);
  const avgMonthlyExp = monthlyData.length > 0 ? Math.round(totalExp / monthlyData.length) : 0;
  const netBalance = totalIncome - totalExp - totalSav;

  const catData = useMemo(() => {
    const cats = {};
    yearExpenses.forEach(e => {
      if (e.category) cats[e.category] = (cats[e.category] || 0) + e.price;
    });
    return Object.entries(cats)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 7);
  }, [yearExpenses]);

  const hasData = monthlyData.some(m => m.gastos > 0 || m.ahorros > 0);

  const fmtY = v => {
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000) return `${Math.round(v / 1_000)}K`;
    return v;
  };

  const periodLabel = isCurrentYear
    ? `${MONTH_NAMES[0]} – ${MONTH_NAMES[maxMonthIdx]} ${year}`
    : `Full year ${year}`;

  return (
    <div style={s.container}>
      {/* Year navigation */}
      <div style={s.yearNav}>
        <button style={s.navBtn} onClick={onPrevYear}>&#8249;</button>
        <div style={s.yearCenter}>
          <h1 style={s.yearTitle}>{year}</h1>
          {isCurrentYear && <span style={s.badge}>In Progress</span>}
        </div>
        <button
          style={{ ...s.navBtn, ...(year >= CURRENT_YEAR ? s.navBtnDisabled : {}) }}
          onClick={() => year < CURRENT_YEAR && onNextYear()}
          disabled={year >= CURRENT_YEAR}
        >&#8250;</button>
      </div>
      <p style={s.periodLabel}>{periodLabel}</p>

      {/* Summary cards */}
      <div style={s.cardsGrid}>
        <AnnualCard label="Total Expenses" value={fmtCOP(totalExp)} color="var(--danger)" />
        <AnnualCard label="Total Savings" value={fmtCOP(totalSav)} color="var(--savings)" />
        {totalIncome > 0 && (
          <AnnualCard label="Recorded Income" value={fmtCOP(totalIncome)} color="var(--accent)" />
        )}
        <AnnualCard label="Monthly Average" value={fmtCOP(avgMonthlyExp)} color="var(--warning)" />
        {totalIncome > 0 && (
          <AnnualCard
            label="Net Balance"
            value={fmtCOP(netBalance)}
            color={netBalance >= 0 ? 'var(--success)' : 'var(--danger)'}
          />
        )}
      </div>

      {/* Monthly bar chart */}
      {hasData ? (
        <div style={s.chartCard}>
          <p style={s.chartTitle}>Expenses & Savings by Month</p>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={monthlyData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }} barGap={3}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={fmtY} tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} width={46} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 13 }}
                labelStyle={{ color: 'var(--text-primary)', fontWeight: 600, marginBottom: 4 }}
                formatter={v => fmtCOP(v)}
              />
              <Bar dataKey="gastos" name="Expenses" fill="var(--danger)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="ahorros" name="Savings" fill="var(--savings)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div style={s.emptyCard}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="var(--text-tertiary)" style={{ marginBottom: 12 }}>
            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14H7v-2h5v2zm5-4H7v-2h10v2zm0-4H7V7h10v2z"/>
          </svg>
          <p style={s.emptyText}>No data recorded for {year}</p>
          <p style={s.emptyHint}>Select a month from the sidebar to add records</p>
        </div>
      )}

      {/* Category breakdown */}
      {catData.length > 0 && (
        <div style={s.chartCard}>
          <p style={s.chartTitle}>Top Categories of the Year</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {catData.map((cat, i) => (
              <div key={cat.name} style={s.catRow}>
                <span style={s.catRank}>{i + 1}</span>
                <span style={s.catName}>{cat.name}</span>
                <div style={s.catBarBg}>
                  <div style={{
                    ...s.catBarFill,
                    width: `${(cat.value / catData[0].value) * 100}%`,
                    background: COLORS[i % COLORS.length],
                  }} />
                </div>
                <span style={s.catValue}>{fmtCOP(cat.value)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Monthly detail table */}
      {monthlyData.some(m => m.gastos > 0 || m.ahorros > 0 || m.income > 0) && (
        <div style={s.chartCard}>
          <p style={s.chartTitle}>Monthly Detail</p>
          <div style={s.tableWrap}>
            <div style={s.tableHead}>
              <span>Month</span>
              <span style={{ textAlign: 'right' }}>Income</span>
              <span style={{ textAlign: 'right' }}>Expenses</span>
              <span style={{ textAlign: 'right' }}>Savings</span>
              <span style={{ textAlign: 'right' }}>Balance</span>
            </div>
            {monthlyData.map((m, i) => {
              const bal = m.income - m.gastos - m.ahorros;
              const hasIncome = m.income > 0;
              return (
                <div key={i} style={s.tableRow}>
                  <span style={s.tableMonth}>{MONTH_NAMES[i]}</span>
                  <span style={{ textAlign: 'right', color: 'var(--accent)', fontSize: 13 }}>
                    {hasIncome ? fmtCOP(m.income) : '—'}
                  </span>
                  <span style={{ textAlign: 'right', color: 'var(--danger)', fontSize: 13 }}>
                    {m.gastos > 0 ? fmtCOP(m.gastos) : '—'}
                  </span>
                  <span style={{ textAlign: 'right', color: 'var(--savings)', fontSize: 13 }}>
                    {m.ahorros > 0 ? fmtCOP(m.ahorros) : '—'}
                  </span>
                  <span style={{
                    textAlign: 'right', fontSize: 13, fontWeight: 600,
                    color: hasIncome ? (bal >= 0 ? 'var(--success)' : 'var(--danger)') : 'var(--text-tertiary)',
                  }}>
                    {hasIncome ? fmtCOP(bal) : '—'}
                  </span>
                </div>
              );
            })}
            {/* Totals row */}
            <div style={s.totalRow}>
              <span style={s.totalLabel}>Total</span>
              <span style={{ textAlign: 'right', color: 'var(--accent)', fontWeight: 700, fontSize: 13 }}>
                {totalIncome > 0 ? fmtCOP(totalIncome) : '—'}
              </span>
              <span style={{ textAlign: 'right', color: 'var(--danger)', fontWeight: 700, fontSize: 13 }}>
                {totalExp > 0 ? fmtCOP(totalExp) : '—'}
              </span>
              <span style={{ textAlign: 'right', color: 'var(--savings)', fontWeight: 700, fontSize: 13 }}>
                {totalSav > 0 ? fmtCOP(totalSav) : '—'}
              </span>
              <span style={{
                textAlign: 'right', fontWeight: 700, fontSize: 13,
                color: totalIncome > 0 ? (netBalance >= 0 ? 'var(--success)' : 'var(--danger)') : 'var(--text-tertiary)',
              }}>
                {totalIncome > 0 ? fmtCOP(netBalance) : '—'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AnnualCard({ label, value, color }) {
  return (
    <div style={s.card}>
      <div style={s.cardLabel}>{label}</div>
      <div style={{ ...s.cardValue, color }}>{value}</div>
    </div>
  );
}

const s = {
  container: {
    maxWidth: 920,
    margin: '0 auto',
    padding: '28px 24px 80px',
  },
  yearNav: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    marginBottom: 4,
  },
  navBtn: {
    width: 36, height: 36,
    borderRadius: '50%',
    border: 'none',
    background: 'var(--surface)',
    boxShadow: 'var(--shadow-sm)',
    cursor: 'pointer',
    fontSize: 22,
    color: 'var(--accent)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'inherit',
  },
  navBtnDisabled: {
    opacity: 0.3,
    cursor: 'default',
  },
  yearCenter: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  yearTitle: {
    fontSize: 34,
    fontWeight: 800,
    letterSpacing: '-1.5px',
    margin: 0,
    color: 'var(--text-primary)',
  },
  badge: {
    fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
    letterSpacing: '0.5px', background: 'var(--accent-light)',
    color: 'var(--accent)', padding: '3px 9px', borderRadius: 20,
  },
  periodLabel: {
    color: 'var(--text-secondary)',
    fontSize: 15,
    margin: '2px 0 24px',
  },
  cardsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
    gap: 14,
    marginBottom: 20,
  },
  card: {
    background: 'var(--surface)',
    borderRadius: 'var(--radius-md)',
    padding: '18px 20px',
    boxShadow: 'var(--shadow-sm)',
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.6px',
    color: 'var(--text-secondary)',
    marginBottom: 6,
  },
  cardValue: {
    fontSize: 18,
    fontWeight: 700,
    letterSpacing: '-0.5px',
    whiteSpace: 'nowrap',
  },
  chartCard: {
    background: 'var(--surface)',
    borderRadius: 'var(--radius-md)',
    padding: '20px 20px 24px',
    boxShadow: 'var(--shadow-sm)',
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 12,
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.6px',
    color: 'var(--text-secondary)',
    margin: '0 0 18px',
  },
  emptyCard: {
    background: 'var(--surface)',
    borderRadius: 'var(--radius-md)',
    padding: '48px 20px',
    boxShadow: 'var(--shadow-sm)',
    marginBottom: 16,
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  emptyText: {
    color: 'var(--text-secondary)',
    fontSize: 16,
    fontWeight: 600,
    margin: '0 0 6px',
  },
  emptyHint: {
    color: 'var(--text-tertiary)',
    fontSize: 13,
    margin: 0,
  },
  catRow: {
    display: 'grid',
    gridTemplateColumns: '22px 110px 1fr 150px',
    alignItems: 'center',
    gap: 10,
  },
  catRank: {
    fontSize: 12,
    fontWeight: 700,
    color: 'var(--text-tertiary)',
    textAlign: 'center',
  },
  catName: {
    fontSize: 13,
    fontWeight: 500,
    color: 'var(--text-primary)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  catBarBg: {
    height: 8,
    background: 'var(--bg)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  catBarFill: {
    height: '100%',
    borderRadius: 4,
    transition: 'width 0.5s ease',
  },
  catValue: {
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--text-primary)',
    textAlign: 'right',
  },
  tableWrap: {
    display: 'flex',
    flexDirection: 'column',
  },
  tableHead: {
    display: 'grid',
    gridTemplateColumns: '110px 1fr 1fr 1fr 1fr',
    padding: '6px 8px',
    fontSize: 11,
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    color: 'var(--text-tertiary)',
    borderBottom: '1px solid var(--border)',
    marginBottom: 2,
  },
  tableRow: {
    display: 'grid',
    gridTemplateColumns: '110px 1fr 1fr 1fr 1fr',
    padding: '9px 8px',
    borderRadius: 'var(--radius-sm)',
  },
  tableMonth: {
    fontSize: 13,
    fontWeight: 500,
    color: 'var(--text-primary)',
  },
  totalRow: {
    display: 'grid',
    gridTemplateColumns: '110px 1fr 1fr 1fr 1fr',
    padding: '10px 8px',
    borderTop: '1.5px solid var(--border)',
    marginTop: 4,
  },
  totalLabel: {
    fontSize: 13,
    fontWeight: 700,
    color: 'var(--text-primary)',
  },
};
