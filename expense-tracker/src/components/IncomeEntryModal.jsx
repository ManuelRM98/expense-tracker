import { useState, useEffect } from 'react';
import { fmtCOP } from '../utils/format';

const TYPES = [
  { value: 'salary', label: 'Salary' },
  { value: 'bonus',  label: 'Bonus' },
  { value: 'other',  label: 'Other' },
];

const DEFAULT = {
  incomeType:     'bonus',
  description:    '',
  currency:       'COP',
  originalAmount: '',
  exchangeRate:   '',
  amountCop:      '',
};

export default function IncomeEntryModal({ open, entry, monthKey, onSave, onClose }) {
  const [form,   setForm]   = useState(DEFAULT);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!open) return;
    if (entry) {
      setForm({
        incomeType:     entry.incomeType,
        description:    entry.description,
        currency:       entry.currency,
        originalAmount: entry.originalAmount != null ? String(entry.originalAmount) : '',
        exchangeRate:   entry.exchangeRate   != null ? String(entry.exchangeRate)   : '',
        amountCop:      String(entry.amountCop),
      });
    } else {
      setForm(DEFAULT);
    }
    setErrors({});
  }, [open, entry]);

  function set(field, val) {
    setForm(f => {
      const next = { ...f, [field]: val };
      // Auto-calculate amountCop when currency=USD and both fields filled
      if (next.currency === 'USD') {
        const usd = parseInt(next.originalAmount, 10) || 0;
        const trm = parseInt(next.exchangeRate,   10) || 0;
        if (usd > 0 && trm > 0) next.amountCop = String(usd * trm);
      }
      // Reset USD fields when switching to COP
      if (field === 'currency' && val === 'COP') {
        next.originalAmount = '';
        next.exchangeRate   = '';
      }
      return next;
    });
    setErrors(e => ({ ...e, [field]: '' }));
  }

  function validate() {
    const e = {};
    if (!form.description.trim())          e.description    = 'Required';
    if (form.currency === 'USD') {
      if (!parseInt(form.originalAmount))  e.originalAmount = 'Required';
      if (!parseInt(form.exchangeRate))    e.exchangeRate   = 'Required';
    }
    if (!parseInt(form.amountCop))         e.amountCop      = 'Required';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSave() {
    if (!validate()) return;
    onSave({
      monthKey,
      incomeType:     form.incomeType,
      description:    form.description.trim(),
      currency:       form.currency,
      originalAmount: form.currency === 'USD' ? parseInt(form.originalAmount, 10) : null,
      exchangeRate:   form.currency === 'USD' ? parseInt(form.exchangeRate,   10) : null,
      amountCop:      parseInt(form.amountCop, 10),
    });
  }

  if (!open) return null;

  const usd    = parseInt(form.originalAmount, 10) || 0;
  const trm    = parseInt(form.exchangeRate,   10) || 0;
  const copVal = parseInt(form.amountCop,      10) || 0;

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.modal} onClick={e => e.stopPropagation()}>
        <div style={s.head}>
          <span style={s.headTitle}>{entry ? 'Edit Income' : 'Add Income'}</span>
          <button style={s.close} onClick={onClose}>✕</button>
        </div>

        <div style={s.body}>
          {/* Type */}
          <div style={s.row}>
            <label style={s.label}>Type</label>
            <div style={s.segmented}>
              {TYPES.map(t => (
                <button
                  key={t.value}
                  style={{ ...s.seg, ...(form.incomeType === t.value ? s.segActive : {}) }}
                  onClick={() => set('incomeType', t.value)}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div style={s.row}>
            <label style={s.label}>Description</label>
            <input
              style={{ ...s.input, borderColor: errors.description ? 'var(--danger)' : 'var(--border)' }}
              value={form.description}
              onChange={e => set('description', e.target.value)}
              placeholder="e.g. Q1 bonus"
            />
            {errors.description && <span style={s.err}>{errors.description}</span>}
          </div>

          {/* Currency toggle */}
          <div style={s.row}>
            <label style={s.label}>Currency</label>
            <div style={s.segmented}>
              {['COP', 'USD'].map(c => (
                <button
                  key={c}
                  style={{ ...s.seg, ...(form.currency === c ? s.segActive : {}) }}
                  onClick={() => set('currency', c)}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* USD fields */}
          {form.currency === 'USD' && (
            <>
              <div style={s.row}>
                <label style={s.label}>Amount (USD)</label>
                <input
                  style={{ ...s.input, borderColor: errors.originalAmount ? 'var(--danger)' : 'var(--border)' }}
                  type="text"
                  inputMode="numeric"
                  value={form.originalAmount}
                  onChange={e => set('originalAmount', e.target.value.replace(/\D/g, ''))}
                  placeholder="500"
                />
                {errors.originalAmount && <span style={s.err}>{errors.originalAmount}</span>}
              </div>

              <div style={s.row}>
                <label style={s.label}>TRM (COP/USD)</label>
                <input
                  style={{ ...s.input, borderColor: errors.exchangeRate ? 'var(--danger)' : 'var(--border)' }}
                  type="text"
                  inputMode="numeric"
                  value={form.exchangeRate}
                  onChange={e => set('exchangeRate', e.target.value.replace(/\D/g, ''))}
                  placeholder="4200"
                />
                {errors.exchangeRate && <span style={s.err}>{errors.exchangeRate}</span>}
              </div>

              {usd > 0 && trm > 0 && (
                <div style={s.calc}>
                  {fmtCOP(usd)} USD × {fmtCOP(trm)} = <strong>{fmtCOP(usd * trm)}</strong>
                </div>
              )}
            </>
          )}

          {/* Amount COP */}
          <div style={s.row}>
            <label style={s.label}>Amount (COP)</label>
            <input
              style={{
                ...s.input,
                borderColor: errors.amountCop ? 'var(--danger)' : 'var(--border)',
                background: form.currency === 'USD' ? 'var(--bg-secondary, var(--surface))' : 'var(--bg)',
              }}
              type="text"
              inputMode="numeric"
              value={form.amountCop}
              onChange={e => set('amountCop', e.target.value.replace(/\D/g, ''))}
              placeholder="2100000"
              readOnly={form.currency === 'USD'}
            />
            {errors.amountCop && <span style={s.err}>{errors.amountCop}</span>}
            {copVal > 0 && <span style={s.preview}>{fmtCOP(copVal)}</span>}
          </div>
        </div>

        <div style={s.foot}>
          <button style={s.btnCancel} onClick={onClose}>Cancel</button>
          <button style={s.btnSave}   onClick={handleSave}>
            {entry ? 'Save changes' : 'Add income'}
          </button>
        </div>
      </div>
    </div>
  );
}

const s = {
  overlay: {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.45)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1000,
    padding: 16,
  },
  modal: {
    background: 'var(--surface)',
    borderRadius: 'var(--radius-md)',
    boxShadow: 'var(--shadow-lg)',
    width: '100%', maxWidth: 440,
    display: 'flex', flexDirection: 'column',
    maxHeight: '90vh', overflow: 'hidden',
  },
  head: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '18px 20px 14px',
    borderBottom: '1px solid var(--border)',
  },
  headTitle: { fontSize: 17, fontWeight: 700, color: 'var(--text-primary)' },
  close: {
    background: 'transparent', border: 'none', cursor: 'pointer',
    fontSize: 16, color: 'var(--text-secondary)', padding: 4,
  },
  body: {
    padding: '16px 20px',
    overflowY: 'auto',
    display: 'flex', flexDirection: 'column', gap: 14,
  },
  row: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' },
  input: {
    padding: '10px 12px', fontSize: 15,
    borderRadius: 'var(--radius-sm)',
    border: '1.5px solid var(--border)',
    background: 'var(--bg)', color: 'var(--text-primary)',
    fontFamily: 'inherit', outline: 'none', width: '100%', boxSizing: 'border-box',
  },
  err:     { fontSize: 12, color: 'var(--danger)' },
  preview: { fontSize: 13, color: 'var(--success)', fontWeight: 600 },
  calc: {
    fontSize: 13, color: 'var(--text-secondary)',
    background: 'var(--bg)', borderRadius: 'var(--radius-sm)',
    padding: '8px 12px',
  },
  segmented: { display: 'flex', gap: 0, borderRadius: 'var(--radius-sm)', overflow: 'hidden', border: '1.5px solid var(--border)' },
  seg: {
    flex: 1, padding: '8px 0', border: 'none', background: 'transparent',
    color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'inherit',
    fontSize: 14, fontWeight: 500,
  },
  segActive: { background: 'var(--accent)', color: '#fff', fontWeight: 600 },
  foot: {
    display: 'flex', justifyContent: 'flex-end', gap: 10,
    padding: '14px 20px',
    borderTop: '1px solid var(--border)',
  },
  btnCancel: {
    padding: '9px 20px', borderRadius: 'var(--radius-sm)',
    border: '1.5px solid var(--border)', background: 'transparent',
    color: 'var(--text-primary)', fontFamily: 'inherit', fontSize: 14, cursor: 'pointer',
  },
  btnSave: {
    padding: '9px 24px', borderRadius: 'var(--radius-sm)',
    border: 'none', background: 'var(--accent)',
    color: '#fff', fontFamily: 'inherit', fontSize: 14, fontWeight: 600, cursor: 'pointer',
  },
};
