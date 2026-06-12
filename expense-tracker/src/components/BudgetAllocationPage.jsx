import { useState, useEffect } from 'react';
import { fmtCOP } from '../utils/format';
import NavArrowButton from './NavArrowButton';

export default function BudgetAllocationPage({
  defaultBudget,
  baseSalary,
  onSaveDefault,
  onBack,
}) {
  const [gFixed,    setGFixed]    = useState('');
  const [gVariable, setGVariable] = useState('');
  const [gSavings,  setGSavings]  = useState('');
  const [gSaving,   setGSaving]   = useState(false);
  const [gError,    setGError]    = useState('');

  useEffect(() => {
    setGFixed(String(defaultBudget.fixedPct));
    setGVariable(String(defaultBudget.variablePct));
    setGSavings(String(defaultBudget.savingsPct));
  }, [defaultBudget]);

  function numInput(setter) {
    return (e) => {
      const v = e.target.value.replace(/\D/g, '');
      setter(v === '' ? '' : String(Math.min(100, parseInt(v, 10))));
      setGError('');
    };
  }

  function sumOf(a, b, c) {
    return (parseInt(a, 10) || 0) + (parseInt(b, 10) || 0) + (parseInt(c, 10) || 0);
  }

  async function handleSave() {
    const f = parseInt(gFixed, 10) || 0;
    const v = parseInt(gVariable, 10) || 0;
    const s = parseInt(gSavings, 10) || 0;
    if (f + v + s !== 100) { setGError(`The sum must be 100. Current: ${f + v + s}`); return; }
    setGSaving(true);
    try { await onSaveDefault({ fixedPct: f, variablePct: v, savingsPct: s }); }
    finally { setGSaving(false); }
  }

  // Real-time preview based on current form values and base salary
  const fPct = parseInt(gFixed, 10) || 0;
  const vPct = parseInt(gVariable, 10) || 0;
  const sPct = parseInt(gSavings, 10) || 0;
  const fixedLimit    = Math.round(baseSalary * fPct / 100);
  const variableLimit = Math.round(baseSalary * vPct / 100);
  const savingsLimit  = Math.round(baseSalary * sPct / 100);
  const sum = sumOf(gFixed, gVariable, gSavings);

  return (
    <div style={s.page}>
      <div style={s.header}>
        <NavArrowButton direction="left" onClick={onBack} title="Back" />
        <h1 style={s.title}>Budget Allocation</h1>
      </div>

      {/* ── Global defaults ── */}
      <section style={s.section}>
        <div style={s.sectionTitle}>Global defaults</div>
        <div style={s.sectionNote}>
          Applied to every month. You can override per month directly from the month view.
        </div>
        <div style={s.card}>
          <PctRow label="Fixed expenses"    icon="🏠" value={gFixed}    onChange={numInput(setGFixed)} />
          <PctRow label="Variable expenses" icon="🛒" value={gVariable} onChange={numInput(setGVariable)} />
          <PctRow label="Savings"           icon="💰" value={gSavings}  onChange={numInput(setGSavings)} />
          <SumIndicator sum={sum} error={gError} />
          <button style={s.btn} onClick={handleSave} disabled={gSaving}>
            {gSaving ? 'Saving…' : 'Save defaults'}
          </button>
        </div>
      </section>

      {/* ── Live preview ── */}
      <section style={s.section}>
        <div style={s.sectionTitle}>Estimated allocation</div>
        <div style={s.sectionNote}>
          {baseSalary > 0
            ? `Based on global salary ${fmtCOP(baseSalary)}. Updates as you change the percentages.`
            : 'Set a global salary in Settings → Global Salary to see the preview.'}
        </div>
        {baseSalary > 0 && (
          <div style={s.previewGrid}>
            <PreviewCard label="Fixed"    pct={fPct} amount={fixedLimit}    color="var(--accent)" />
            <PreviewCard label="Variable" pct={vPct} amount={variableLimit} color="var(--warning)" />
            <PreviewCard label="Savings"  pct={sPct} amount={savingsLimit}  color="var(--success)" />
          </div>
        )}
      </section>
    </div>
  );
}

function PctRow({ label, icon, value, onChange }) {
  return (
    <div style={s.pctRow}>
      <span style={s.pctIcon}>{icon}</span>
      <span style={s.pctLabel}>{label}</span>
      <div style={s.pctInputWrap}>
        <input
          style={s.pctInput}
          type="text"
          inputMode="numeric"
          value={value}
          onChange={onChange}
          maxLength={3}
        />
        <span style={s.pctSymbol}>%</span>
      </div>
    </div>
  );
}

function SumIndicator({ sum, error }) {
  const ok = sum === 100;
  const color = ok ? 'var(--success)' : 'var(--danger)';
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
      {error && <span style={{ fontSize: 12, color: 'var(--danger)' }}>{error}</span>}
      <span style={{ fontSize: 13, fontWeight: 700, color }}>
        {sum}/100 {ok ? '✓' : ''}
      </span>
    </div>
  );
}

function PreviewCard({ label, pct, amount, color }) {
  return (
    <div style={{ ...s.previewCard, borderTop: `3px solid ${color}` }}>
      <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-secondary)', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color, letterSpacing: '-0.5px' }}>{pct}%</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginTop: 4 }}>
        {amount > 0 ? fmtCOP(amount) : '—'}
      </div>
    </div>
  );
}

const s = {
  page: { maxWidth: 640, margin: '0 auto', padding: '32px 24px 80px' },
  header: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 },
  title: { fontSize: 28, fontWeight: 700, letterSpacing: '-0.5px', color: 'var(--text-primary)', margin: 0 },
  section: { marginBottom: 28 },
  sectionTitle: { fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 },
  sectionNote: { fontSize: 12, color: 'var(--text-secondary)', marginBottom: 12, lineHeight: 1.5 },
  card: { background: 'var(--surface)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-sm)', padding: '20px 20px', display: 'flex', flexDirection: 'column', gap: 14 },
  pctRow: { display: 'flex', alignItems: 'center', gap: 12 },
  pctIcon: { fontSize: 20, width: 28, textAlign: 'center', flexShrink: 0 },
  pctLabel: { flex: 1, fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' },
  pctInputWrap: { display: 'flex', alignItems: 'center', gap: 4 },
  pctInput: {
    width: 60, padding: '8px 10px', fontSize: 16, fontWeight: 700, textAlign: 'right',
    borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--border)',
    background: 'var(--bg)', color: 'var(--text-primary)', fontFamily: 'inherit',
    outline: 'none',
  },
  pctSymbol: { fontSize: 15, fontWeight: 600, color: 'var(--text-secondary)' },
  btn: {
    alignSelf: 'flex-end', padding: '10px 22px', borderRadius: 'var(--radius-sm)',
    border: 'none', background: 'var(--accent)', color: '#fff',
    fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
  },
  previewGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 },
  previewCard: { background: 'var(--surface)', borderRadius: 'var(--radius-md)', padding: '16px 14px', boxShadow: 'var(--shadow-sm)' },
};
