import { useState, useEffect } from 'react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
  LineChart, Line,
} from 'recharts';
import { fmtCOP, MONTH_SHORT } from '../utils/format';
import { getTrend } from '../services/api';

// ── Palette ──────────────────────────────────────────────────
const COLORS = ['#007aff','#34c759','#ff9500','#ff3b30','#af52de','#5ac8fa','#ffcc00'];

// ── Shared tooltip ───────────────────────────────────────────
const TooltipBox = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={ts.box}>
      {label && <p style={ts.label}>{label}</p>}
      {payload.map((p, i) => (
        <p key={i} style={{ ...ts.value, color: p.color || p.fill }}>
          {p.name}: {fmtCOP(p.value)}
        </p>
      ))}
    </div>
  );
};
const ts = {
  box:   { background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10, padding:'10px 14px', boxShadow:'var(--shadow-md)', fontSize:13 },
  label: { fontWeight:600, marginBottom:4, color:'var(--text-primary)' },
  value: { fontWeight:500 },
};

// ── Card wrapper ─────────────────────────────────────────────
function ChartCard({ title, children, empty }) {
  return (
    <div style={c.card}>
      <p style={c.title}>{title}</p>
      {empty
        ? <div style={c.empty}>Not enough data</div>
        : children}
    </div>
  );
}
const c = {
  card:  { background:'var(--surface)', borderRadius:'var(--radius-md)', boxShadow:'var(--shadow-sm)', padding:'20px 16px' },
  title: { fontSize:12, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.6px', color:'var(--text-secondary)', marginBottom:16 },
  empty: { textAlign:'center', padding:'32px 0', color:'var(--text-tertiary)', fontSize:14 },
};

// ── Shared donut label ───────────────────────────────────────
const DonutLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
  if (percent < 0.05) return null;
  const RADIAN = Math.PI / 180;
  const r = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + r * Math.cos(-midAngle * RADIAN);
  const y = cy + r * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central" fontSize={13} fontWeight={700}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

// ── 1. Donut — Card vs Cash ──────────────────────────────────
export function CardVsCashChart({ expenses }) {
  const cardTotal = expenses.filter(e => e.cardPay === 'Yes').reduce((s,e) => s+e.price, 0);
  const cashTotal = expenses.filter(e => e.cardPay === 'No').reduce((s,e) => s+e.price, 0);
  const data = [
    { name: 'Card', value: cardTotal },
    { name: 'Cash', value: cashTotal },
  ].filter(d => d.value > 0);

  return (
    <ChartCard title="Card vs Cash" empty={data.length === 0}>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={55} outerRadius={85}
               dataKey="value" labelLine={false} label={DonutLabel}>
            {data.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
          </Pie>
          <Tooltip content={<TooltipBox />} />
          <Legend iconType="circle" iconSize={10} wrapperStyle={{ fontSize:13 }} />
        </PieChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// ── 2. Bar — Spending by Card Type ───────────────────────────
export function ByCardTypeChart({ expenses }) {
  const cardExpenses = expenses.filter(e => e.cardPay === 'Yes' && e.cardType);
  const map = {};
  cardExpenses.forEach(e => { map[e.cardType] = (map[e.cardType] || 0) + e.price; });
  const data = Object.entries(map).map(([name, value]) => ({ name, value }));

  return (
    <ChartCard title="Spending by Card" empty={data.length === 0}>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} barSize={32} margin={{ top:4, right:8, left:8, bottom:0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize:12, fill:'var(--text-secondary)' }} axisLine={false} tickLine={false} />
          <YAxis hide />
          <Tooltip content={<TooltipBox />} />
          <Bar dataKey="value" name="Amount" radius={[6,6,0,0]}>
            {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// ── 3. Bar — Spending by Person ──────────────────────────────
export function ByPersonChart({ expenses }) {
  const map = {};
  expenses.forEach(e => { map[e.whoPaid] = (map[e.whoPaid] || 0) + e.price; });
  const data = Object.entries(map)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  return (
    <ChartCard title="Spending by Person" empty={data.length === 0}>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} barSize={32} margin={{ top:4, right:8, left:8, bottom:0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize:12, fill:'var(--text-secondary)' }} axisLine={false} tickLine={false} />
          <YAxis hide />
          <Tooltip content={<TooltipBox />} />
          <Bar dataKey="value" name="Amount" radius={[6,6,0,0]}>
            {data.map((_, i) => <Cell key={i} fill={COLORS[(i + 2) % COLORS.length]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// ── 4. Line — Monthly Trend (all data via backend analytics) ────────────────
// PERF-03: fetches from GET /analytics/trend instead of receiving all expenses.
// BUG-07: server-side aggregation respects billing_month (PERF-02 fix).
export function MonthlyTrendChart() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getTrend(12).then(points => {
      const formatted = points.map(p => ({
        name: (() => {
          const [y, m] = p.monthKey.split('-');
          return `${MONTH_SHORT[parseInt(m, 10) - 1]} ${String(y).slice(2)}`;
        })(),
        total: p.totalExpenses,
      }));
      setData(formatted);
      setLoading(false);
    }).catch(err => { console.error('MonthlyTrendChart fetch failed:', err); setLoading(false); });
  }, []);

  const hasData = data.some(d => d.total > 0);

  return (
    <ChartCard title="Monthly Trend (12 months)" empty={!loading && !hasData}>
      {loading ? (
        <div style={c.empty}>Loading…</div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={data} margin={{ top:4, right:8, left:8, bottom:0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize:11, fill:'var(--text-secondary)' }} axisLine={false} tickLine={false} />
            <YAxis hide />
            <Tooltip content={<TooltipBox />} />
            <Line type="monotone" dataKey="total" name="Total" stroke="var(--accent)"
                  strokeWidth={2.5} dot={{ r:3, fill:'var(--accent)' }}
                  activeDot={{ r:5 }} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}

// ── 5. Donut — Expenses by Category ─────────────────────────
export function ExpensesByCategoryChart({ expenses }) {
  const map = {};
  expenses.forEach(e => { if (e.category) map[e.category] = (map[e.category] || 0) + e.price; });
  const data = Object.entries(map)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 7);

  return (
    <ChartCard title="By Category" empty={data.length === 0}>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={55} outerRadius={85}
               dataKey="value" labelLine={false} label={DonutLabel}>
            {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Pie>
          <Tooltip content={<TooltipBox />} />
          <Legend iconType="circle" iconSize={10} wrapperStyle={{ fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// ── 6. Donut — Fixed vs Variable ────────────────────────────
export function FixedVsVariableChart({ expenses }) {
  const fixedTotal    = expenses.filter(e => e.costType === 'fixed').reduce((s, e) => s + e.price, 0);
  const variableTotal = expenses.filter(e => e.costType !== 'fixed').reduce((s, e) => s + e.price, 0);
  const data = [
    { name: 'Fixed',    value: fixedTotal },
    { name: 'Variable', value: variableTotal },
  ].filter(d => d.value > 0);

  return (
    <ChartCard title="Fixed vs Variable" empty={data.length === 0}>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={55} outerRadius={85}
               dataKey="value" labelLine={false} label={DonutLabel}>
            {data.map((_, i) => <Cell key={i} fill={[COLORS[0], COLORS[2]][i]} />)}
          </Pie>
          <Tooltip content={<TooltipBox />} />
          <Legend iconType="circle" iconSize={10} wrapperStyle={{ fontSize: 13 }} />
        </PieChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// ── 7. Donut — Income Breakdown ──────────────────────────────
export function IncomeBreakdownChart({ income, totalExp, totalSav }) {
  const remaining = Math.max(income - totalExp - totalSav, 0);
  const data = [
    { name: 'Expenses',  value: totalExp },
    { name: 'Savings',   value: totalSav },
    { name: 'Remaining', value: remaining },
  ].filter(d => d.value > 0);

  const SLICE_COLORS = ['var(--danger)', 'var(--success)', 'var(--accent)'];

  return (
    <ChartCard title="Income Breakdown" empty={income <= 0 || data.length === 0}>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={55} outerRadius={85}
               dataKey="value" labelLine={false} label={DonutLabel}>
            {data.map((_, i) => <Cell key={i} fill={SLICE_COLORS[i]} />)}
          </Pie>
          <Tooltip content={<TooltipBox />} />
          <Legend iconType="circle" iconSize={10} wrapperStyle={{ fontSize: 13 }} />
        </PieChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// ── 8. Donut — Savings by Category ──────────────────────────
export function SavingsByCategoryChart({ savings }) {
  const map = {};
  savings.forEach(sv => { if (sv.category) map[sv.category] = (map[sv.category] || 0) + sv.price; });
  const data = Object.entries(map)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  return (
    <ChartCard title="Savings by Category" empty={data.length === 0}>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={55} outerRadius={85}
               dataKey="value" labelLine={false} label={DonutLabel}>
            {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Pie>
          <Tooltip content={<TooltipBox />} />
          <Legend iconType="circle" iconSize={10} wrapperStyle={{ fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// ── 10. Bar list — Credit Cards Due ─────────────────────────
export function CreditCardBreakdownChart({ expenses }) {
  const map = {};
  expenses
    .filter(e => e.cardPay === 'Yes' && e.cardType)
    .forEach(e => { map[e.cardType] = (map[e.cardType] || 0) + e.price; });

  const data = Object.entries(map)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <ChartCard title="Credit Cards Due" empty={data.length === 0}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {data.map((card, i) => (
          <div key={card.name} style={cc.row}>
            <span style={cc.name}>{card.name}</span>
            <div style={cc.barBg}>
              <div style={{
                ...cc.barFill,
                width: `${(card.value / data[0].value) * 100}%`,
                background: COLORS[i % COLORS.length],
              }} />
            </div>
            <span style={cc.amount}>{fmtCOP(card.value)}</span>
            <span style={cc.pct}>{Math.round((card.value / total) * 100)}%</span>
          </div>
        ))}
        {data.length > 1 && (
          <div style={cc.totalRow}>
            <span style={cc.totalLabel}>Total</span>
            <div />
            <span style={cc.totalAmount}>{fmtCOP(total)}</span>
            <span style={cc.pct}>100%</span>
          </div>
        )}
      </div>
    </ChartCard>
  );
}
const cc = {
  row: {
    display: 'grid',
    gridTemplateColumns: '140px 1fr 120px 44px',
    alignItems: 'center',
    gap: 10,
  },
  name: {
    fontSize: 13,
    fontWeight: 500,
    color: 'var(--text-primary)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  barBg: {
    height: 8,
    background: 'var(--bg)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
    transition: 'width 0.5s ease',
  },
  amount: {
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--text-primary)',
    textAlign: 'right',
  },
  pct: {
    fontSize: 12,
    fontWeight: 500,
    color: 'var(--text-tertiary)',
    textAlign: 'right',
  },
  totalRow: {
    display: 'grid',
    gridTemplateColumns: '140px 1fr 120px 44px',
    alignItems: 'center',
    gap: 10,
    borderTop: '1px solid var(--border)',
    paddingTop: 10,
    marginTop: 2,
  },
  totalLabel: {
    fontSize: 12,
    fontWeight: 700,
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  totalAmount: {
    fontSize: 13,
    fontWeight: 700,
    color: 'var(--text-primary)',
    textAlign: 'right',
  },
};

// ── 9. Line — Savings Trend (12 months) via backend analytics ───────────────
// PERF-03: fetches from GET /analytics/trend instead of receiving all savings.
export function SavingsTrendChart() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getTrend(12).then(points => {
      const formatted = points.map(p => ({
        name: (() => {
          const [y, m] = p.monthKey.split('-');
          return `${MONTH_SHORT[parseInt(m, 10) - 1]} ${String(y).slice(2)}`;
        })(),
        total: p.totalSavings,
      }));
      setData(formatted);
      setLoading(false);
    }).catch(err => { console.error('SavingsTrendChart fetch failed:', err); setLoading(false); });
  }, []);

  const hasData = data.some(d => d.total > 0);

  return (
    <ChartCard title="Savings Trend (12 months)" empty={!loading && !hasData}>
      {loading ? (
        <div style={c.empty}>Loading…</div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={data} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} />
            <YAxis hide />
            <Tooltip content={<TooltipBox />} />
            <Line type="monotone" dataKey="total" name="Savings" stroke="var(--savings)"
                  strokeWidth={2.5} dot={{ r: 3, fill: 'var(--savings)' }}
                  activeDot={{ r: 5 }} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}
