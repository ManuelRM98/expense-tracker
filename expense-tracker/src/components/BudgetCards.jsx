import { useState, useEffect } from 'react';
import { fmtCOP } from '../utils/format';

/**
 * Shows 3 budget allocation cards + an inline override toggle for this month.
 */
export default function BudgetCards({
  budget,
  income,
  totalFixed,
  totalVariable,
  totalSavings,
  onSaveOverride,
  onClearOverride,
  variant = 'all', // 'all' | 'expenses' | 'savings'
}) {
  if (!income || income <= 0) return null;

  const fixedLimit    = Math.round(income * budget.fixedPct    / 100);
  const variableLimit = Math.round(income * budget.variablePct / 100);
  const savingsLimit  = Math.round(income * budget.savingsPct  / 100);

  const showExpenses = variant === 'all' || variant === 'expenses';
  const showSavings  = variant === 'all' || variant === 'savings';

  return (
    <div style={s.wrap}>
      <div style={s.labelRow}>
        <span style={s.label}>Budget allocation</span>
        {budget.isOverride && <span style={s.overrideBadge}>Month override</span>}
      </div>
      <div style={s.grid}>
        {showExpenses && (
          <BudgetCard
            title="Fixed expenses"
            limit={fixedLimit}
            used={totalFixed}
            pct={budget.fixedPct}
            color="var(--accent)"
            invertGood={false}
          />
        )}
        {showExpenses && (
          <BudgetCard
            title="Variable expenses"
            limit={variableLimit}
            used={totalVariable}
            pct={budget.variablePct}
            color="var(--warning)"
            invertGood={false}
          />
        )}
        {showSavings && (
          <BudgetCard
            title="Savings"
            limit={savingsLimit}
            used={totalSavings}
            pct={budget.savingsPct}
            color="var(--success)"
            invertGood={true}
          />
        )}
      </div>

      {showExpenses && (
        <OverridePanel
          budget={budget}
          onSaveOverride={onSaveOverride}
          onClearOverride={onClearOverride}
        />
      )}
    </div>
  );
}

function OverridePanel({ budget, onSaveOverride, onClearOverride }) {
  const [open,    setOpen]    = useState(false);
  const [oFixed,    setOFixed]    = useState('');
  const [oVariable, setOVariable] = useState('');
  const [oSavings,  setOSavings]  = useState('');
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState('');

  // Sync form when budget changes (e.g. month navigation)
  useEffect(() => {
    setOFixed(String(budget.fixedPct));
    setOVariable(String(budget.variablePct));
    setOSavings(String(budget.savingsPct));
    setOpen(false);
    setError('');
  }, [budget]);

  function numInput(setter) {
    return (e) => {
      const v = e.target.value.replace(/\D/g, '');
      setter(v === '' ? '' : String(Math.min(100, parseInt(v, 10))));
      setError('');
    };
  }

  const sum = (parseInt(oFixed, 10) || 0) + (parseInt(oVariable, 10) || 0) + (parseInt(oSavings, 10) || 0);

  async function handleSave() {
    if (sum !== 100) { setError(`Sum must be 100. Current: ${sum}`); return; }
    setSaving(true);
    try {
      await onSaveOverride({ fixedPct: parseInt(oFixed), variablePct: parseInt(oVariable), savingsPct: parseInt(oSavings) });
      setOpen(false);
    } finally { setSaving(false); }
  }

  async function handleClear() {
    setSaving(true);
    try {
      await onClearOverride();
      setOpen(false);
    } finally { setSaving(false); }
  }

  return (
    <div style={s.overrideWrap}>
      <div style={s.overrideToggleRow}>
        <span style={s.overrideLabel}>Override this month</span>
        <button
          role="switch"
          aria-checked={open}
          onClick={() => setOpen(v => !v)}
          style={{ ...s.toggle, background: open ? 'var(--accent)' : 'var(--border)' }}
        >
          <span style={{ ...s.toggleThumb, transform: open ? 'translateX(20px)' : 'translateX(2px)' }} />
        </button>
      </div>

      {open && (
        <div style={s.overrideForm}>
          <InlinePctRow label="Fixed"    value={oFixed}    onChange={numInput(setOFixed)} />
          <InlinePctRow label="Variable" value={oVariable} onChange={numInput(setOVariable)} />
          <InlinePctRow label="Savings"  value={oSavings}  onChange={numInput(setOSavings)} />

          <div style={s.overrideFooter}>
            <span style={{ fontSize: 12, fontWeight: 700, color: sum === 100 ? 'var(--success)' : 'var(--danger)' }}>
              {sum}/100 {sum === 100 ? '✓' : ''}
            </span>
            {error && <span style={{ fontSize: 11, color: 'var(--danger)', flex: 1, textAlign: 'center' }}>{error}</span>}
            <div style={{ display: 'flex', gap: 8 }}>
              {budget.isOverride && (
                <button style={s.btnOutline} onClick={handleClear} disabled={saving}>
                  Remove
                </button>
              )}
              <button style={s.btnSave} onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InlinePctRow({ label, value, onChange }) {
  return (
    <div style={s.inlineRow}>
      <span style={s.inlineLabel}>{label}</span>
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

function BudgetCard({ title, limit, used, pct, color, invertGood }) {
  const remaining  = limit - used;
  const usedRatio  = limit > 0 ? Math.min(used / limit, 1) : 0;
  const usedPctNum = Math.round(usedRatio * 100);

  const barColor = usedPctNum >= 90 ? 'var(--danger)' : usedPctNum >= 70 ? 'var(--warning)' : 'var(--success)';

  const isOver = !invertGood && remaining < 0;

  return (
    <div style={{ ...s.card, borderTop: `3px solid ${color}` }}>
      <div style={s.cardTitle}>{title}</div>

      <div style={s.limitRow}>
        <span style={s.limitLabel}>Limit ({pct}%)</span>
        <span style={{ ...s.limitValue, color }}>{fmtCOP(limit)}</span>
      </div>

      <div style={s.barTrack}>
        <div style={{ ...s.barFill, width: `${Math.min(usedPctNum, 100)}%`, background: barColor }} />
      </div>
      <div style={s.barLabels}>
        <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>0</span>
        <span style={{ fontSize: 10, fontWeight: 600, color: barColor }}>{usedPctNum}%</span>
        <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>100%</span>
      </div>

      <div style={s.statsRow}>
        <StatItem label={invertGood ? 'Saved' : 'Spent'} value={fmtCOP(used)} color="var(--text-primary)" />
        <StatItem
          label={invertGood ? 'To go' : isOver ? 'Over budget' : 'Remaining'}
          value={fmtCOP(Math.abs(remaining))}
          color={isOver ? 'var(--danger)' : invertGood ? 'var(--text-secondary)' : 'var(--success)'}
        />
      </div>
    </div>
  );
}

function StatItem({ label, value, color }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px', color: 'var(--text-secondary)' }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 700, color }}>{value}</span>
    </div>
  );
}

const s = {
  wrap: { marginBottom: 20 },
  labelRow: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 },
  label: { fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--text-secondary)' },
  overrideBadge: {
    fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px',
    padding: '2px 8px', borderRadius: 10,
    background: 'rgba(255,149,0,0.12)', color: 'var(--warning)',
  },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 },
  card: {
    background: 'var(--surface)', borderRadius: 'var(--radius-md)',
    padding: '16px 16px 14px', boxShadow: 'var(--shadow-sm)',
    display: 'flex', flexDirection: 'column', gap: 8,
  },
  cardTitle: { fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.4px' },
  limitRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  limitLabel: { fontSize: 11, color: 'var(--text-secondary)' },
  limitValue: { fontSize: 16, fontWeight: 700, letterSpacing: '-0.3px' },
  barTrack: { height: 6, borderRadius: 3, background: 'var(--border)', overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 3, transition: 'width 0.4s ease, background 0.3s' },
  barLabels: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: -2 },
  statsRow: { display: 'flex', justifyContent: 'space-between', paddingTop: 6, borderTop: '1px solid var(--border)' },

  // Override panel
  overrideWrap: {
    marginTop: 12,
    background: 'var(--surface)', borderRadius: 'var(--radius-md)',
    boxShadow: 'var(--shadow-sm)', overflow: 'hidden',
  },
  overrideToggleRow: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '12px 16px',
  },
  overrideLabel: { fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' },
  toggle: { position: 'relative', width: 44, height: 26, borderRadius: 13, border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0, transition: 'background 0.2s' },
  toggleThumb: { position: 'absolute', top: 3, width: 20, height: 20, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.3)', transition: 'transform 0.2s', display: 'block' },
  overrideForm: {
    borderTop: '1px solid var(--border)',
    padding: '14px 16px',
    display: 'flex', flexDirection: 'column', gap: 10,
  },
  inlineRow: { display: 'flex', alignItems: 'center', gap: 10 },
  inlineLabel: { flex: 1, fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' },
  pctInputWrap: { display: 'flex', alignItems: 'center', gap: 4 },
  pctInput: {
    width: 56, padding: '6px 8px', fontSize: 15, fontWeight: 700, textAlign: 'right',
    borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--border)',
    background: 'var(--bg)', color: 'var(--text-primary)', fontFamily: 'inherit',
    outline: 'none',
  },
  pctSymbol: { fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)' },
  overrideFooter: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    gap: 8, paddingTop: 6, borderTop: '1px solid var(--border)',
  },
  btnSave: {
    padding: '7px 18px', borderRadius: 'var(--radius-sm)', border: 'none',
    background: 'var(--accent)', color: '#fff', fontSize: 13, fontWeight: 600,
    cursor: 'pointer', fontFamily: 'inherit',
  },
  btnOutline: {
    padding: '7px 14px', borderRadius: 'var(--radius-sm)',
    border: '1.5px solid var(--danger)', background: 'transparent',
    color: 'var(--danger)', fontSize: 13, fontWeight: 600,
    cursor: 'pointer', fontFamily: 'inherit',
  },
};
