import { useState, useEffect } from 'react';
import { fmtCOP, formatAmountInput, parseAmount } from '../utils/format';
import NavArrowButton from './NavArrowButton';

export default function GlobalSalaryPage({ baseSalary, onSave, onBack }) {
  const [value, setValue]   = useState('');
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  useEffect(() => {
    setValue(baseSalary > 0 ? formatAmountInput(String(baseSalary)) : '');
  }, [baseSalary]);

  function handleChange(e) {
    setValue(formatAmountInput(e.target.value));
    setError('');
  }

  async function handleSave() {
    const amount = parseAmount(value);
    if (!amount || amount <= 0) {
      setError('Enter a valid salary amount.');
      return;
    }
    setSaving(true);
    try {
      await onSave(amount);
    } finally {
      setSaving(false);
    }
  }

  const parsed = parseAmount(value) || 0;

  return (
    <div style={s.page}>
      <div style={s.header}>
        <NavArrowButton direction="left" onClick={onBack} title="Back" />
        <h1 style={s.title}>Global Salary</h1>
      </div>

      <div style={s.card}>
        <div style={s.label}>Monthly base salary (COP)</div>
        <div style={s.note}>
          This value will be auto-loaded as your salary on the 1st of each new month.
          Changes only apply to future months — past entries are not modified.
        </div>

        <input
          style={{ ...s.input, borderColor: error ? 'var(--danger)' : 'var(--border)' }}
          type="text"
          inputMode="decimal"
          placeholder="e.g. 5000000"
          value={value}
          onChange={handleChange}
        />

        {parsed > 0 && (
          <div style={s.preview}>{fmtCOP(parsed)}</div>
        )}

        {error && <div style={s.error}>{error}</div>}

        <button style={s.btn} onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>

      {baseSalary > 0 && (
        <div style={s.currentWrap}>
          <span style={s.currentLabel}>Current value:</span>
          <span style={s.currentValue}>{fmtCOP(baseSalary)}</span>
        </div>
      )}
    </div>
  );
}

const s = {
  page: {
    maxWidth: 640,
    margin: '0 auto',
    padding: '32px 24px 80px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginBottom: 28,
  },
  title: {
    fontSize: 28,
    fontWeight: 700,
    letterSpacing: '-0.5px',
    color: 'var(--text-primary)',
    margin: 0,
  },
  card: {
    background: 'var(--surface)',
    borderRadius: 'var(--radius-md)',
    boxShadow: 'var(--shadow-sm)',
    padding: '24px 20px',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  note: {
    fontSize: 13,
    color: 'var(--text-tertiary)',
    lineHeight: 1.5,
  },
  input: {
    width: '100%',
    padding: '12px 14px',
    fontSize: 18,
    fontWeight: 600,
    borderRadius: 'var(--radius-sm)',
    border: '1.5px solid var(--border)',
    background: 'var(--bg)',
    color: 'var(--text-primary)',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
    outline: 'none',
  },
  preview: {
    fontSize: 14,
    color: 'var(--success)',
    fontWeight: 600,
  },
  error: {
    fontSize: 13,
    color: 'var(--danger)',
  },
  btn: {
    alignSelf: 'flex-end',
    padding: '10px 28px',
    borderRadius: 'var(--radius-sm)',
    border: 'none',
    background: 'var(--accent)',
    color: '#fff',
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  currentWrap: {
    marginTop: 20,
    padding: '14px 20px',
    background: 'var(--surface)',
    borderRadius: 'var(--radius-md)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  currentLabel: {
    fontSize: 14,
    color: 'var(--text-secondary)',
  },
  currentValue: {
    fontSize: 16,
    fontWeight: 700,
    color: 'var(--text-primary)',
  },
};
