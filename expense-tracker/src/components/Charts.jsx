import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
  LineChart, Line,
} from 'recharts';
import { fmtCOP, MONTH_SHORT } from '../utils/format';

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

// ── 4. Line — Monthly Trend (all data) ──────────────────────
export function MonthlyTrendChart({ expenses }) {
  // Build last 12 months
  const now = new Date();
  const months = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ year: d.getFullYear(), month: d.getMonth(), label: `${MONTH_SHORT[d.getMonth()]} ${d.getFullYear()}` });
  }

  const data = months.map(m => {
    const total = expenses
      .filter(e => {
        const [y, mo] = e.date.split('-');
        return parseInt(y) === m.year && parseInt(mo) - 1 === m.month;
      })
      .reduce((s, e) => s + e.price, 0);
    return { name: `${MONTH_SHORT[m.month]} ${String(m.year).slice(2)}`, total };
  });

  const hasData = data.some(d => d.total > 0);

  return (
    <ChartCard title="Monthly Trend (12 months)" empty={!hasData}>
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

// ── 9. Line — Savings Trend (12 months) ─────────────────────
export function SavingsTrendChart({ savings }) {
  const now = new Date();
  const months = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ year: d.getFullYear(), month: d.getMonth() });
  }

  const data = months.map(m => {
    const total = savings
      .filter(sv => {
        const [y, mo] = sv.date.split('-');
        return parseInt(y) === m.year && parseInt(mo) - 1 === m.month;
      })
      .reduce((s, sv) => s + sv.price, 0);
    return { name: `${MONTH_SHORT[m.month]} ${String(m.year).slice(2)}`, total };
  });

  const hasData = data.some(d => d.total > 0);

  return (
    <ChartCard title="Savings Trend (12 months)" empty={!hasData}>
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
    </ChartCard>
  );
}
