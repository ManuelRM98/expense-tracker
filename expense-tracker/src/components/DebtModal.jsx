import { useState, useEffect } from 'react';
import { todayISO } from '../utils/format';
import DatePicker from './DatePicker';

const EMPTY = {
  direction:   '',
  person:      '',
  description: '',
  amount:      '',
  date:        '',
};

export default function DebtModal({ open, onClose, onSave, editing }) {
  const [form, setForm]     = useState(EMPTY);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (open) {
      if (editing) {
        setForm({
          direction:   editing.direction,
          person:      editing.person,
          description: editing.description,
          amount:      Number(editing.amount).toLocaleString('es-CO'),
          date:        editing.createdDate,
        });
      } else {
        setForm({ ...EMPTY, date: todayISO() });
      }
      setErrors({});
    }
  }, [open, editing]);

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
    if (!form.direction)          e.direction   = 'Please select a direction.';
    if (!form.person.trim())      e.person      = 'Name is required.';
    if (!form.description.trim()) e.description = 'Description is required.';
    if (!form.amount)             e.amount      = 'Amount is required.';
    if (!form.date)               e.date        = 'Date is required.';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit(ev) {
    ev.preventDefault();
    if (!validate()) return;
    const amount = parseInt(form.amount.replace(/\D/g, ''), 10);
    onSave({
      direction:   form.direction,
      person:      form.person.trim(),
      description: form.description.trim(),
      amount,
      createdDate: form.date,
    });
    onClose();
  }

  if (!open) return null;

  return (
    <div style={s.overlay} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={s.modal} role="dialog" aria-modal="true">
        <div style={s.mHeader}>
          <span style={s.mTitle}>{editing ? 'Edit Debt' : 'Add Debt'}</span>
          <button style={s.closeBtn} onClick={onClose}>&#x2715;</button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div style={s.body}>

            {/* Direction */}
            <div style={s.group}>
              <label style={s.label}>Direction</label>
              <div style={s.segRow}>
                <button
                  type="button"
                  style={{ ...s.seg, ...(form.direction === 'they_owe_me' ? s.segActiveOwed : {}) }}
                  onClick={() => set('direction', 'they_owe_me')}
                >
                  They owe me
                </button>
                <button
                  type="button"
                  style={{ ...s.seg, ...(form.direction === 'i_owe_them' ? s.segActiveOwe : {}) }}
                  onClick={() => set('direction', 'i_owe_them')}
                >
                  I owe them
                </button>
              </div>
              {errors.direction && <span style={s.errMsg}>{errors.direction}</span>}
            </div>

            {/* Person */}
            <div style={s.group}>
              <label style={s.label}>Person</label>
              <input
                style={{ ...s.input, ...(errors.person ? s.inputErr : {}) }}
                type="text"
                placeholder="e.g. Dad"
                value={form.person}
                onChange={e => set('person', e.target.value)}
              />
              {errors.person && <span style={s.errMsg}>{errors.person}</span>}
            </div>

            {/* Description */}
            <div style={s.group}>
              <label style={s.label}>Description</label>
              <input
                style={{ ...s.input, ...(errors.description ? s.inputErr : {}) }}
                type="text"
                placeholder="e.g. Beers at the bar"
                value={form.description}
                onChange={e => set('description', e.target.value)}
              />
              {errors.description && <span style={s.errMsg}>{errors.description}</span>}
            </div>

            {/* Amount */}
            <div style={s.group}>
              <label style={s.label}>Amount (COP $)</label>
              <input
                style={{ ...s.input, ...(errors.amount ? s.inputErr : {}) }}
                type="text"
                inputMode="numeric"
                placeholder="e.g. 40,000"
                value={form.amount}
                onChange={e => {
                  const digits = e.target.value.replace(/\D/g, '');
                  set('amount', digits ? parseInt(digits, 10).toLocaleString('es-CO') : '');
                }}
              />
              {errors.amount && <span style={s.errMsg}>{errors.amount}</span>}
            </div>

            {/* Date */}
            <div style={s.group}>
              <label style={s.label}>Initial Date</label>
              <DatePicker
                value={form.date}
                onChange={v => set('date', v)}
                hasError={!!errors.date}
                accent="var(--accent)"
              />
              {errors.date && <span style={s.errMsg}>{errors.date}</span>}
            </div>

          </div>

          <div style={s.footer}>
            <button type="button" style={s.cancelBtn} onClick={onClose}>Cancel</button>
            <button type="submit" style={s.saveBtn}>{editing ? 'Save Changes' : 'Add Debt'}</button>
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
    width: '100%', maxWidth: 420,
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
    width: 28, height: 28,
    border: 'none', borderRadius: '50%',
    background: 'var(--surface-2)',
    color: 'var(--text-secondary)',
    cursor: 'pointer', fontSize: 13,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
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
  segRow: { display: 'flex', gap: 8 },
  seg: {
    flex: 1, padding: '9px 12px',
    border: '1.5px solid var(--border)', borderRadius: 'var(--radius-sm)',
    background: 'var(--bg)', color: 'var(--text-secondary)',
    fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
    transition: 'all 0.12s',
  },
  segActiveOwed: {
    background: 'rgba(52,199,89,0.12)',
    borderColor: 'var(--success)',
    color: 'var(--success)',
    fontWeight: 600,
  },
  segActiveOwe: {
    background: 'rgba(255,59,48,0.1)',
    borderColor: 'var(--danger)',
    color: 'var(--danger)',
    fontWeight: 600,
  },
  footer: {
    display: 'flex', gap: 10, justifyContent: 'flex-end',
    padding: '14px 20px',
    borderTop: '1px solid var(--border)',
  },
  cancelBtn: {
    padding: '9px 18px', border: '1.5px solid var(--border)',
    borderRadius: 'var(--radius-sm)', background: 'transparent',
    color: 'var(--text-secondary)', fontSize: 13, fontWeight: 500,
    cursor: 'pointer', fontFamily: 'inherit',
  },
  saveBtn: {
    padding: '9px 18px', border: 'none',
    borderRadius: 'var(--radius-sm)', background: 'var(--accent)',
    color: '#fff', fontSize: 13, fontWeight: 600,
    cursor: 'pointer', fontFamily: 'inherit',
  },
};
