import { useState, useEffect } from 'react';
import { todayISO, formatAmountInput, parseAmount } from '../utils/format';
import DatePicker from './DatePicker';
import useIsMobile from '../hooks/useIsMobile';
import { getModalOverlayStyle, getModalStyle } from '../utils/mobileModalStyles';
import { DragHandle } from '../utils/mobileModal';

const EMPTY = {
  date: '',
  desc: '',
  category: '',
  price: '',
  cardPay: '',
  whoPaid: '',
  cardType: '',
};

function initialSavingForm(editing, cloning) {
  if (editing) {
    return {
      date:     editing.date,
      desc:     editing.desc,
      category: editing.category,
      price:    Number(editing.price).toLocaleString('es-CO'),
      cardPay:  editing.cardPay,
      whoPaid:  editing.whoPaid ?? '',
      cardType: editing.cardType ?? '',
    };
  }
  if (cloning) {
    return {
      date:     todayISO(),
      desc:     cloning.desc,
      category: cloning.category ?? '',
      price:    Number(cloning.price).toLocaleString('es-CO'),
      cardPay:  cloning.cardPay,
      whoPaid:  cloning.whoPaid ?? '',
      cardType: cloning.cardType ?? '',
    };
  }
  return { ...EMPTY, date: todayISO(), whoPaid: 'Me' };
}

export default function SavingModal({
  open, onClose, onSave,
  cardTypes, onAddCard, onRemoveCard,
  savingCategories, onAddCategory, onRemoveCategory,
  onRenameCategory,  // Part C.2: optional callback (oldName, newName) => void
  editing,
  cloning,
}) {
  // State is initialised from props at mount; parent remounts via key when open/editing/cloning changes
  const [form, setForm]             = useState(() => initialSavingForm(editing, cloning));
  const [addingCard, setAddingCard] = useState(false);
  const [newCard, setNewCard]       = useState('');
  const [managingCards, setManagingCards] = useState(false);
  const [addingCat, setAddingCat]   = useState(false);
  const [newCat, setNewCat]         = useState('');
  const [managingCats, setManagingCats] = useState(false);
  // Part C.2: inline rename state
  const [renamingCat,  setRenamingCat]  = useState(null);
  const [renameCatVal, setRenameCatVal] = useState('');
  const [errors, setErrors]         = useState({});

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
    return formatAmountInput(raw);
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
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;
    const price = parseAmount(form.price);
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
    if (savingCategories.length <= 1) return;
    onRemoveCategory(name);
    if (form.category === name) set('category', '');
  }

  const isMobile = useIsMobile();

  if (!open) return null;

  return (
    <div style={getModalOverlayStyle(isMobile)} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={getModalStyle(isMobile, { maxWidth: 500 })} role="dialog" aria-modal="true">
        {isMobile && <DragHandle />}
        <div style={s.mHeader}>
          <span style={s.mTitle}>{editing ? 'Edit Saving' : cloning ? 'Duplicate Saving' : 'Add Saving'}</span>
          <button style={s.closeBtn} onClick={onClose}>&#x2715;</button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="modal-form-grid">
            {/* Date */}
            <div style={s.group}>
              <label style={s.label}>Date</label>
              <DatePicker
                value={form.date}
                onChange={v => set('date', v)}
                hasError={!!errors.date}
                accent="var(--savings)"
              />
              {errors.date && <span style={s.errMsg}>{errors.date}</span>}
            </div>

            {/* Price */}
            <div style={s.group}>
              <label style={s.label}>Price (COP $)</label>
              <input
                type="text" inputMode="decimal" placeholder="e.g. 200.000"
                style={{ ...s.input, ...(errors.price ? s.inputError : {}) }}
                value={form.price}
                onChange={e => set('price', formatPrice(e.target.value))}
              />
              {errors.price && <span style={s.errMsg}>{errors.price}</span>}
            </div>

            {/* Description */}
            <div className="modal-grid-full" style={{ ...s.group, ...s.full }}>
              <label style={s.label}>Description</label>
              <input
                type="text" placeholder="What is this saving for?"
                style={{ ...s.input, ...(errors.desc ? s.inputError : {}) }}
                value={form.desc}
                onChange={e => set('desc', e.target.value)}
              />
              {errors.desc && <span style={s.errMsg}>{errors.desc}</span>}
            </div>

            {/* Category */}
            <div className="modal-grid-full" style={{ ...s.group, ...s.full }}>
              <div style={s.labelRow}>
                <label style={s.label}>Category</label>
                <button type="button" style={s.manageBtn}
                  onClick={() => { setManagingCats(m => !m); setAddingCat(false); }}>
                  {managingCats ? 'Done' : 'Manage'}
                </button>
              </div>
              {managingCats ? (
                <div style={s.pillsWrap}>
                  {savingCategories.map(c => (
                    <span key={c} style={s.pill}>
                      {renamingCat === c ? (
                        <>
                          <input
                            autoFocus
                            type="text"
                            style={{ ...s.input, padding: '2px 6px', fontSize: 13, width: 100 }}
                            value={renameCatVal}
                            onChange={e => setRenameCatVal(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                const n = renameCatVal.trim();
                                if (n && n !== c && onRenameCategory) onRenameCategory(c, n);
                                setRenamingCat(null);
                              }
                              if (e.key === 'Escape') setRenamingCat(null);
                            }}
                          />
                          <button type="button" style={s.pillDel} onClick={() => {
                            const n = renameCatVal.trim();
                            if (n && n !== c && onRenameCategory) onRenameCategory(c, n);
                            setRenamingCat(null);
                          }}>&#10003;</button>
                        </>
                      ) : (
                        <>
                          {c}
                          {onRenameCategory && (
                            <button
                              type="button"
                              style={{ ...s.pillDel, color: 'var(--text-tertiary)', fontSize: 11 }}
                              title={`Rename "${c}"`}
                              onClick={() => { setRenamingCat(c); setRenameCatVal(c); }}
                            >
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                              </svg>
                            </button>
                          )}
                          <button
                            type="button"
                            style={{ ...s.pillDel, ...(savingCategories.length <= 1 ? s.pillDelDisabled : {}) }}
                            disabled={savingCategories.length <= 1}
                            onClick={() => handleRemoveCat(c)}
                            title={savingCategories.length <= 1 ? 'Cannot delete the last item' : `Delete "${c}"`}
                          >&#x2715;</button>
                        </>
                      )}
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
                    {savingCategories.map(c => <option key={c} value={c}>{c}</option>)}
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
            <div style={s.group}>
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
              {editing ? 'Save Changes' : cloning ? 'Save Copy' : 'Save Saving'}
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
    fontSize: 11, fontWeight: 600, color: 'var(--savings)', background: 'none',
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
    borderRadius: 'var(--radius-sm)', padding: '11px 36px 11px 14px',
    color: 'var(--text-primary)', outline: 'none', width: '100%',
    appearance: 'none', WebkitAppearance: 'none',
    backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%236d6d72' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E\")",
    backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center',
  },
  inlineAdd: { display: 'flex', gap: 8, marginTop: 8 },
  addBtn: {
    padding: '11px 16px', borderRadius: 'var(--radius-sm)', border: 'none',
    background: 'var(--savings)', color: '#fff', fontSize: 14, fontWeight: 600,
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
    background: 'var(--savings)', color: '#fff', fontSize: 15, fontWeight: 600,
    cursor: 'pointer', fontFamily: 'inherit',
    boxShadow: '0 4px 12px rgba(94,92,230,.35)',
  },
};
