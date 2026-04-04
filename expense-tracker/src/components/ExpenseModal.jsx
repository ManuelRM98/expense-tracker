import { useState, useEffect } from 'react';
import { todayISO } from '../utils/format';

const EMPTY = {
  date: '',
  desc: '',
  category: '',
  price: '',
  cardPay: '',
  whoPaid: '',
  cardType: '',
  costType: '',
};

export default function ExpenseModal({
  open, onClose, onSave,
  cardTypes, onAddCard, onRemoveCard,
  expenseCategories, onAddCategory, onRemoveCategory,
  editing,
  defaultCostType, // pre-selects 'fixed' or 'variable' when opening for a new expense
}) {
  const [form, setForm]             = useState(EMPTY);
  const [addingCard, setAddingCard] = useState(false);
  const [newCard, setNewCard]       = useState('');
  const [managingCards, setManagingCards] = useState(false);
  const [addingCat, setAddingCat]   = useState(false);
  const [newCat, setNewCat]         = useState('');
  const [managingCats, setManagingCats] = useState(false);
  const [errors, setErrors]         = useState({});

  useEffect(() => {
    if (open) {
      if (editing) {
        setForm({
          date:     editing.date,
          desc:     editing.desc,
          category: editing.category ?? '',
          price:    Number(editing.price).toLocaleString('es-CO'),
          cardPay:  editing.cardPay,
          whoPaid:  editing.whoPaid,
          cardType: editing.cardType ?? '',
          costType: editing.costType ?? '',
        });
      } else {
        setForm({ ...EMPTY, date: todayISO(), costType: defaultCostType ?? '' });
      }
      setErrors({});
      setAddingCard(false); setNewCard(''); setManagingCards(false);
      setAddingCat(false);  setNewCat('');  setManagingCats(false);
    }
  }, [open, editing, defaultCostType]);

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }));
    setErrors(e => ({ ...e, [field]: false }));
  }

  function formatPrice(raw) {
    const digits = raw.replace(/\D/g, '');
    return digits ? parseInt(digits, 10).toLocaleString('es-CO') : '';
  }

  function validate() {
    const e = {};
    if (!form.date)            e.date     = 'Date is required.';
    if (!form.desc.trim())     e.desc     = 'Description is required.';
    if (!form.category)        e.category = 'Category is required.';
    if (!form.price)           e.price    = 'Price is required.';
    if (!form.cardPay)         e.cardPay  = 'Please select Yes or No.';
    if (!form.whoPaid.trim())  e.whoPaid  = 'Who Paid is required.';
    if (form.cardPay === 'Yes' && !form.cardType) e.cardType = 'Please select a card type.';
    if (!form.costType) e.costType = 'Please select a cost type.';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;
    const price = parseInt(form.price.replace(/\D/g, ''), 10);
    onSave({ ...form, price });
    onClose();
  }

  function handleSaveCard() {
    const name = newCard.trim();
    if (!name) return;
    onAddCard(name);
    set('cardType', name);
    setAddingCard(false); setNewCard('');
  }

  function handleRemoveCard(name) {
    if (cardTypes.length <= 1) return;
    onRemoveCard(name);
    if (form.cardType === name) set('cardType', '');
  }

  function handleSaveCat() {
    const name = newCat.trim();
    if (!name) return;
    onAddCategory(name);
    set('category', name);
    setAddingCat(false); setNewCat('');
  }

  function handleRemoveCat(name) {
    if (expenseCategories.length <= 1) return;
    onRemoveCategory(name);
    if (form.category === name) set('category', '');
  }

  if (!open) return null;

  return (
    <div style={s.overlay} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={s.modal} role="dialog" aria-modal="true">
        <div style={s.mHeader}>
          <span style={s.mTitle}>{editing ? 'Edit Expense' : 'Add Expense'}</span>
          <button style={s.closeBtn} onClick={onClose}>&#x2715;</button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div style={s.grid}>
            {/* Date */}
            <div style={s.group}>
              <label style={s.label}>Date</label>
              <input
                type="date"
                style={{ ...s.input, ...(errors.date ? s.inputError : {}) }}
                value={form.date}
                onChange={e => set('date', e.target.value)}
              />
              {errors.date && <span style={s.errMsg}>{errors.date}</span>}
            </div>

            {/* Price */}
            <div style={s.group}>
              <label style={s.label}>Price (COP $)</label>
              <input
                type="text" inputMode="numeric" placeholder="e.g. 45,000"
                style={{ ...s.input, ...(errors.price ? s.inputError : {}) }}
                value={form.price}
                onChange={e => set('price', formatPrice(e.target.value))}
              />
              {errors.price && <span style={s.errMsg}>{errors.price}</span>}
            </div>

            {/* Description */}
            <div style={{ ...s.group, ...s.full }}>
              <label style={s.label}>Description</label>
              <input
                type="text" placeholder="What was this for?"
                style={{ ...s.input, ...(errors.desc ? s.inputError : {}) }}
                value={form.desc}
                onChange={e => set('desc', e.target.value)}
              />
              {errors.desc && <span style={s.errMsg}>{errors.desc}</span>}
            </div>

            {/* Category */}
            <div style={{ ...s.group, ...s.full }}>
              <div style={s.labelRow}>
                <label style={s.label}>Category</label>
                <button type="button" style={s.manageBtn}
                  onClick={() => { setManagingCats(m => !m); setAddingCat(false); }}>
                  {managingCats ? 'Done' : 'Manage'}
                </button>
              </div>
              {managingCats ? (
                <div style={s.pillsWrap}>
                  {expenseCategories.map(c => (
                    <span key={c} style={s.pill}>
                      {c}
                      <button
                        type="button"
                        style={{ ...s.pillDel, ...(expenseCategories.length <= 1 ? s.pillDelDisabled : {}) }}
                        disabled={expenseCategories.length <= 1}
                        onClick={() => handleRemoveCat(c)}
                        title={expenseCategories.length <= 1 ? 'Cannot delete the last item' : `Delete "${c}"`}
                      >&#x2715;</button>
                    </span>
                  ))}
                </div>
              ) : (
                <>
                  <select
                    style={{ ...s.select, ...(errors.category ? s.inputError : {}) }}
                    value={addingCat ? '__add__' : form.category}
                    onChange={e => {
                      if (e.target.value === '__add__') { setAddingCat(true); }
                      else { set('category', e.target.value); setAddingCat(false); }
                    }}
                  >
                    <option value="">Select category…</option>
                    {expenseCategories.map(c => <option key={c} value={c}>{c}</option>)}
                    <option value="__add__">+ Add new…</option>
                  </select>
                  {errors.category && <span style={s.errMsg}>{errors.category}</span>}
                  {addingCat && (
                    <div style={s.inlineAdd}>
                      <input
                        type="text" placeholder="New category…" style={s.input}
                        value={newCat} onChange={e => setNewCat(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleSaveCat(); } }}
                        autoFocus
                      />
                      <button type="button" style={s.addBtn} onClick={handleSaveCat}>Add</button>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Cost Type */}
            <div style={{ ...s.group, ...s.full }}>
              <label style={s.label}>Cost Type</label>
              <div style={s.segmentedControl}>
                {['variable', 'fixed'].map((type, i, arr) => (
                  <button
                    key={type}
                    type="button"
                    style={{
                      ...s.segmentBtn,
                      ...(i === arr.length - 1 ? { borderRight: 'none' } : {}),
                      ...(form.costType === type ? s.segmentBtnActive : {}),
                    }}
                    onClick={() => set('costType', type)}
                  >
                    {type === 'variable' ? 'Variable' : 'Fixed'}
                  </button>
                ))}
              </div>
              {errors.costType && <span style={s.errMsg}>{errors.costType}</span>}
            </div>

            {/* Who Paid */}
            <div style={s.group}>
              <label style={s.label}>Who Paid</label>
              <input
                type="text" placeholder="Name"
                style={{ ...s.input, ...(errors.whoPaid ? s.inputError : {}) }}
                value={form.whoPaid}
                onChange={e => set('whoPaid', e.target.value)}
              />
              {errors.whoPaid && <span style={s.errMsg}>{errors.whoPaid}</span>}
            </div>

            {/* Payment with Card */}
            <div style={s.group}>
              <label style={s.label}>Payment with Card</label>
              <select
                style={{ ...s.select, ...(errors.cardPay ? s.inputError : {}) }}
                value={form.cardPay}
                onChange={e => {
                  set('cardPay', e.target.value);
                  if (e.target.value !== 'Yes') { set('cardType', ''); setAddingCard(false); }
                }}
              >
                <option value="">Select…</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
              {errors.cardPay && <span style={s.errMsg}>{errors.cardPay}</span>}
            </div>

            {/* Card Type */}
            <div style={{ ...s.group, ...s.full }}>
              <div style={s.labelRow}>
                <label style={{ ...s.label, ...(form.cardPay !== 'Yes' ? s.labelDisabled : {}) }}>Card Type</label>
                {form.cardPay === 'Yes' && (
                  <button type="button" style={s.manageBtn}
                    onClick={() => { setManagingCards(m => !m); setAddingCard(false); }}>
                    {managingCards ? 'Done' : 'Manage'}
                  </button>
                )}
              </div>
              {managingCards && form.cardPay === 'Yes' ? (
                <div style={s.pillsWrap}>
                  {cardTypes.map(c => (
                    <span key={c} style={s.pill}>
                      {c}
                      <button
                        type="button"
                        style={{ ...s.pillDel, ...(cardTypes.length <= 1 ? s.pillDelDisabled : {}) }}
                        disabled={cardTypes.length <= 1}
                        onClick={() => handleRemoveCard(c)}
                        title={cardTypes.length <= 1 ? 'Cannot delete the last card' : `Delete "${c}"`}
                      >&#x2715;</button>
                    </span>
                  ))}
                </div>
              ) : (
                <>
                  <select
                    disabled={form.cardPay !== 'Yes'}
                    style={{ ...s.select, ...(form.cardPay !== 'Yes' ? s.selectDisabled : {}) }}
                    value={addingCard ? '__add__' : form.cardType}
                    onChange={e => {
                      if (e.target.value === '__add__') { setAddingCard(true); }
                      else { set('cardType', e.target.value); setAddingCard(false); }
                    }}
                  >
                    <option value="">Select card…</option>
                    {cardTypes.map(c => <option key={c} value={c}>{c}</option>)}
                    <option value="__add__">+ Add new…</option>
                  </select>
                  {errors.cardType && <span style={s.errMsg}>{errors.cardType}</span>}
                  {addingCard && (
                    <div style={s.inlineAdd}>
                      <input
                        type="text" placeholder="New card name…" style={s.input}
                        value={newCard} onChange={e => setNewCard(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleSaveCard(); } }}
                        autoFocus
                      />
                      <button type="button" style={s.addBtn} onClick={handleSaveCard}>Add</button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          <div style={s.actions}>
            <button type="button" style={s.cancelBtn} onClick={onClose}>Cancel</button>
            <button type="submit" style={s.saveBtn}>
              {editing ? 'Save Changes' : 'Save Expense'}
            </button>
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
    zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
  },
  modal: {
    background: 'var(--surface)', borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--shadow-lg)', width: '100%', maxWidth: 500,
    padding: 28, animation: 'modalIn .22s cubic-bezier(.34,1.56,.64,1)',
  },
  mHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  mTitle: { fontSize: 20, fontWeight: 700, letterSpacing: '-0.4px' },
  closeBtn: {
    width: 32, height: 32, borderRadius: '50%', border: 'none',
    background: 'var(--bg)', cursor: 'pointer', fontSize: 16,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: 'var(--text-secondary)', fontFamily: 'inherit',
  },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 },
  group: { display: 'flex', flexDirection: 'column', gap: 6 },
  full: { gridColumn: '1 / -1' },
  labelRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 },
  label: { fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-secondary)' },
  labelDisabled: { opacity: 0.4 },
  manageBtn: {
    fontSize: 11, fontWeight: 600, color: 'var(--accent)', background: 'none',
    border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit',
    textTransform: 'uppercase', letterSpacing: '0.5px',
  },
  pillsWrap: { display: 'flex', flexWrap: 'wrap', gap: 8, padding: '10px 0' },
  pill: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    background: 'var(--surface-2)', border: '1px solid var(--border)',
    borderRadius: 20, padding: '4px 10px', fontSize: 13, fontWeight: 500,
    color: 'var(--text-primary)',
  },
  pillDel: {
    background: 'none', border: 'none', cursor: 'pointer', padding: 0,
    color: 'var(--danger)', fontSize: 12, lineHeight: 1,
    display: 'flex', alignItems: 'center',
  },
  pillDelDisabled: { opacity: 0.3, cursor: 'not-allowed' },
  input: {
    fontFamily: 'inherit', fontSize: 15,
    background: 'var(--bg)', border: '1.5px solid var(--border)',
    borderRadius: 'var(--radius-sm)', padding: '11px 14px',
    color: 'var(--text-primary)', outline: 'none', width: '100%',
  },
  inputError: { borderColor: 'var(--danger)' },
  errMsg: { fontSize: 12, color: 'var(--danger)', fontWeight: 500, marginTop: 2 },
  selectDisabled: { opacity: 0.4, cursor: 'not-allowed', pointerEvents: 'none' },
  select: {
    fontFamily: 'inherit', fontSize: 15,
    background: 'var(--bg)', border: '1.5px solid var(--border)',
    borderRadius: 'var(--radius-sm)', padding: '11px 14px',
    color: 'var(--text-primary)', outline: 'none', width: '100%',
    appearance: 'none',
    backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='%236d6d72'%3E%3Cpath d='M7 10l5 5 5-5z'/%3E%3C/svg%3E\")",
    backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', paddingRight: 32,
  },
  inlineAdd: { display: 'flex', gap: 8, marginTop: 8 },
  addBtn: {
    padding: '11px 16px', borderRadius: 'var(--radius-sm)', border: 'none',
    background: 'var(--accent)', color: '#fff', fontSize: 14, fontWeight: 600,
    cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
  },
  actions: { display: 'flex', gap: 12, marginTop: 24 },
  cancelBtn: {
    flex: 1, padding: 13, borderRadius: 'var(--radius-sm)',
    border: '1.5px solid var(--border)', background: 'var(--surface)',
    fontSize: 15, fontWeight: 600, cursor: 'pointer',
    color: 'var(--text-primary)', fontFamily: 'inherit',
  },
  saveBtn: {
    flex: 2, padding: 13, borderRadius: 'var(--radius-sm)', border: 'none',
    background: 'var(--accent)', color: '#fff', fontSize: 15, fontWeight: 600,
    cursor: 'pointer', fontFamily: 'inherit',
    boxShadow: '0 4px 12px rgba(180,30,30,.35)',
  },
  segmentedControl: {
    display: 'flex', borderRadius: 'var(--radius-sm)',
    border: '1.5px solid var(--border)', overflow: 'hidden',
  },
  segmentBtn: {
    flex: 1, padding: '11px 0', border: 'none', borderRight: '1px solid var(--border)',
    background: 'var(--bg)', color: 'var(--text-secondary)',
    fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
    transition: 'all .15s',
  },
  segmentBtnActive: {
    background: 'var(--accent)', color: '#fff', fontWeight: 600,
  },
};
