import { useState, useEffect } from 'react';
import { todayISO, fmtCOP } from '../utils/format';
import DatePicker from './DatePicker';

export default function DebtPaymentModal({ open, onClose, onSave, debt }) {
  const [form, setForm]     = useState({ amount: '', date: todayISO(), note: '' });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (open) {
      setForm({ amount: '', date: todayISO(), note: '' });
      setErrors({});
    }
  }, [open]);

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }));
    setErrors(e => ({ ...e, [field]: false }));
  }

  function validate() {
    const e = {};
    if (!form.amount) e.amount = 'Amount is required.';
    if (!form.date)   e.date   = 'Date is required.';
    const parsed = parseInt(form.amount.replace(/\D/g, ''), 10);
    if (parsed <= 0)  e.amount = 'Amount must be greater than 0.';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit(ev) {
    ev.preventDefault();
    if (!validate()) return;
    onSave({
      amount: parseInt(form.amount.replace(/\D/g, ''), 10),
      date:   form.date,
      note:   form.note.trim(),
    });
    onClose();
  }

  if (!open || !debt) return null;

  const remaining = debt.totalRemaining;

  return (
    <div style={s.overlay} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={s.modal} role="dialog" aria-modal="true">
        <div style={s.mHeader}>
          <span style={s.mTitle}>Add Payment</span>
          <button style={s.closeBtn} onClick={onClose}>&#x2715;</button>
        </div>

        <div style={s.debtInfo}>
          <span style={s.debtPerson}>{debt.person}</span>
          <span style={s.debtDesc}>{debt.description}</span>
          <div style={s.debtAmounts}>
            <span style={s.amtLabel}>Remaining:</span>
            <span style={s.amtValue}>{fmtCOP(remaining)}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div style={s.body}>

            <div style={s.group}>
              <label style={s.label}>Amount paid (COP $)</label>
              <input
                style={{ ...s.input, ...(errors.amount ? s.inputErr : {}) }}
                type="text"
                inputMode="numeric"
                placeholder="e.g. 20,000"
                value={form.amount}
                autoFocus
                onChange={e => {
                  const digits = e.target.value.replace(/\D/g, '');
                  set('amount', digits ? parseInt(digits, 10).toLocaleString('es-CO') : '');
                }}
              />
              {errors.amount && <span style={s.errMsg}>{errors.amount}</span>}
            </div>

            <div style={s.group}>
              <label style={s.label}>Payment Date</label>
              <DatePicker
                value={form.date}
                onChange={v => set('date', v)}
                hasError={!!errors.date}
                accent="var(--accent)"
              />
              {errors.date && <span style={s.errMsg}>{errors.date}</span>}
            </div>

            <div style={s.group}>
              <label style={s.label}>Note (optional)</label>
              <input
                style={s.input}
                type="text"
                placeholder="e.g. Cash transfer"
                value={form.note}
                onChange={e => set('note', e.target.value)}
              />
            </div>

          </div>

          <div style={s.footer}>
            <button type="button" style={s.cancelBtn} onClick={onClose}>Cancel</button>
            <button type="submit" style={s.saveBtn}>Add Payment</button>
          </div>
        </form>
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
  },
  modal: {
    background: 'var(--surface)',
    borderRadius: 'var(--radius)',
    border: '1px solid var(--border)',
    width: '100%', maxWidth: 380,
    boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
    overflow: 'hidden',
  },
  mHeader: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '16px 20px',
    borderBottom: '1px solid var(--border)',
  },
  mTitle: { fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' },
  closeBtn: {
    width: 28, height: 28, border: 'none', borderRadius: '50%',
    background: 'var(--surface-2)', color: 'var(--text-secondary)',
    cursor: 'pointer', fontSize: 13,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  debtInfo: {
    padding: '12px 20px',
    background: 'var(--surface-2)',
    display: 'flex', flexDirection: 'column', gap: 4,
    borderBottom: '1px solid var(--border)',
  },
  debtPerson: { fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' },
  debtDesc: { fontSize: 12, color: 'var(--text-secondary)' },
  debtAmounts: { display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 },
  amtLabel: { fontSize: 12, color: 'var(--text-tertiary)' },
  amtValue: { fontSize: 13, fontWeight: 600, color: 'var(--danger)' },
  body: { padding: '20px', display: 'flex', flexDirection: 'column', gap: 14 },
  group: { display: 'flex', flexDirection: 'column', gap: 5 },
  label: { fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' },
  input: {
    width: '100%', padding: '9px 12px',
    border: '1.5px solid var(--border)', borderRadius: 'var(--radius-sm)',
    background: 'var(--bg)', color: 'var(--text-primary)',
    fontSize: 14, fontFamily: 'inherit',
    boxSizing: 'border-box', outline: 'none',
  },
  inputErr: { borderColor: 'var(--danger)' },
  errMsg: { fontSize: 11, color: 'var(--danger)', marginTop: 2 },
  footer: {
    display: 'flex', gap: 10, justifyContent: 'flex-end',
    padding: '14px 20px', borderTop: '1px solid var(--border)',
  },
  cancelBtn: {
    padding: '9px 18px', border: '1.5px solid var(--border)',
    borderRadius: 'var(--radius-sm)', background: 'transparent',
    color: 'var(--text-secondary)', fontSize: 13, fontWeight: 500,
    cursor: 'pointer', fontFamily: 'inherit',
  },
  saveBtn: {
    padding: '9px 18px', border: 'none',
    borderRadius: 'var(--radius-sm)', background: 'var(--success)',
    color: '#fff', fontSize: 13, fontWeight: 600,
    cursor: 'pointer', fontFamily: 'inherit',
  },
};
