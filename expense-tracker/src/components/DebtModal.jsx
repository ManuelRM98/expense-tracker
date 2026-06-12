import { useState, useEffect } from 'react';
import { todayISO } from '../utils/format';
import DatePicker from './DatePicker';
import useIsMobile from '../hooks/useIsMobile';
import { getModalOverlayStyle, getModalStyle } from '../utils/mobileModalStyles';
import { DragHandle } from '../utils/mobileModal';

const EMPTY = {
  direction:   '',
  person:      '',
  description: '',
  amount:      '',
  date:        '',
};

export default function DebtModal({ open, onClose, onSave, editing }) {
  // State is initialised from props at mount; parent remounts via key when open/editing changes
  const [form, setForm] = useState(() => editing
    ? {
        direction:   editing.direction,
        person:      editing.person,
        description: editing.description,
        amount:      Number(editing.amount).toLocaleString('es-CO'),
        date:        editing.createdDate,
      }
    : { ...EMPTY, date: todayISO() }
  );
  const [errors, setErrors] = useState({});

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

  const isMobile = useIsMobile();

  if (!open) return null;

  return (
    <div style={getModalOverlayStyle(isMobile)} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={getModalStyle(isMobile, { maxWidth: 440 })} role="dialog" aria-modal="true">
        {isMobile && <DragHandle />}
        <div style={s.mHeader}>
          <span style={s.mTitle}>{editing ? 'Edit Debt' : 'Add Debt'}</span>
          <button style={s.closeBtn} onClick={onClose}>&#x2715;</button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div style={s.body}>

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
    background: 'rgba(0,0,0,0.42)',
    backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1000, padding: 20,
  },
  modal: {
    background: 'var(--surface)',
    borderRadius: 'var(--radius-lg)',
    width: '100%', maxWidth: 420,
    boxShadow: 'var(--shadow-lg)',
    padding: 28,
    animation: 'modalIn .22s cubic-bezier(.34,1.56,.64,1)',
  },
  mHeader: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 24,
  },
  mTitle: { fontSize: 20, fontWeight: 700, letterSpacing: '-0.4px' },
  closeBtn: {
    width: 32, height: 32,
    border: 'none', borderRadius: '50%',
    background: 'var(--bg)',
    color: 'var(--text-secondary)',
    cursor: 'pointer', fontSize: 16,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: 'inherit',
  },
  body: { display: 'flex', flexDirection: 'column', gap: 16 },
  group: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' },
  input: {
    width: '100%', padding: '11px 14px',
    border: '1.5px solid var(--border)', borderRadius: 'var(--radius-sm)',
    background: 'var(--bg)', color: 'var(--text-primary)',
    fontSize: 15, fontFamily: 'inherit',
    outline: 'none',
  },
  inputErr: { borderColor: 'var(--danger)' },
  errMsg: { fontSize: 12, color: 'var(--danger)', fontWeight: 500, marginTop: 2 },
  segRow: { display: 'flex', gap: 8 },
  seg: {
    flex: 1, padding: '11px 14px',
    border: '1.5px solid var(--border)', borderRadius: 'var(--radius-sm)',
    background: 'var(--bg)', color: 'var(--text-secondary)',
    fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
    transition: 'all 0.15s',
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
    display: 'flex', gap: 12,
    marginTop: 24,
  },
  cancelBtn: {
    flex: 1, padding: 13, border: '1.5px solid var(--border)',
    borderRadius: 'var(--radius-sm)', background: 'var(--surface)',
    color: 'var(--text-primary)', fontSize: 15, fontWeight: 600,
    cursor: 'pointer', fontFamily: 'inherit',
  },
  saveBtn: {
    flex: 2, padding: 13, border: 'none',
    borderRadius: 'var(--radius-sm)', background: 'var(--accent)',
    color: '#fff', fontSize: 15, fontWeight: 600,
    cursor: 'pointer', fontFamily: 'inherit',
    boxShadow: '0 4px 12px rgba(139,0,0,.35)',
  },
};
