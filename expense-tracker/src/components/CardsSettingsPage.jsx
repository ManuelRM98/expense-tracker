import { useState } from 'react';

export default function CardsSettingsPage({ cardTypes, onAddCard, onRemoveCard, onUpdateCardCutOff, onRenameCard, onBack }) {
  const [newCardName, setNewCardName] = useState('');
  const [addingCard,  setAddingCard]  = useState(false);
  const [pendingCutOff, setPendingCutOff] = useState({});  // { [name]: string }
  // Part C.2: rename state — { [name]: string } for inline editing
  const [renamingCard, setRenamingCard] = useState(null);  // name being renamed
  const [renameValue,  setRenameValue]  = useState('');

  function handleAddCard() {
    const name = newCardName.trim();
    if (!name) return;
    onAddCard(name);
    setNewCardName('');
    setAddingCard(false);
  }

  function handleCutOffChange(name, raw) {
    setPendingCutOff(prev => ({ ...prev, [name]: raw }));
  }

  function handleCutOffBlur(name, raw) {
    const val = raw === '' ? null : parseInt(raw, 10);
    if (raw !== '' && (isNaN(val) || val < 1 || val > 31)) return;
    onUpdateCardCutOff(name, val);
  }

  function getCutOffDisplay(card) {
    if (pendingCutOff[card.name] !== undefined) return pendingCutOff[card.name];
    return card.cutOffDay !== null ? String(card.cutOffDay) : '';
  }

  function handleRenameSubmit(oldName) {
    const newName = renameValue.trim();
    if (!newName || newName === oldName) { setRenamingCard(null); return; }
    if (onRenameCard) onRenameCard(oldName, newName);
    setRenamingCard(null);
  }

  return (
    <div style={s.page}>
      <div style={s.header}>
        <button style={s.backBtn} onClick={onBack}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
          </svg>
        </button>
        <h1 style={s.title}>Cards</h1>
      </div>

      <p style={s.description}>
        Assign a cut-off date to each card. If a purchase is made on or after the cut-off day,
        it will be recorded in the following month.
      </p>

      <div style={s.card}>
        {cardTypes.map((card, i) => (
          <div key={card.name}>
            {i > 0 && <div style={s.divider} />}
            <div style={s.row}>
              <div style={s.rowLeft}>
                <div style={s.cardIcon}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z"/>
                  </svg>
                </div>
                {renamingCard === card.name ? (
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <input
                      autoFocus
                      style={s.renameInput}
                      value={renameValue}
                      onChange={e => setRenameValue(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleRenameSubmit(card.name);
                        if (e.key === 'Escape') setRenamingCard(null);
                      }}
                    />
                    <button style={s.renameOkBtn} onClick={() => handleRenameSubmit(card.name)}>OK</button>
                    <button style={s.renameCancelBtn} onClick={() => setRenamingCard(null)}>&#x2715;</button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={s.cardName}>{card.name}</span>
                    {onRenameCard && (
                      <button
                        style={s.renameIconBtn}
                        title={`Rename "${card.name}"`}
                        onClick={() => { setRenamingCard(card.name); setRenameValue(card.name); }}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                        </svg>
                      </button>
                    )}
                  </div>
                )}
              </div>
              <div style={s.rowRight}>
                <div style={s.cutOffGroup}>
                  <label style={s.cutOffLabel}>Cut-off day</label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    placeholder="—"
                    style={s.cutOffInput}
                    value={getCutOffDisplay(card)}
                    onChange={e => handleCutOffChange(card.name, e.target.value)}
                    onBlur={e => {
                      handleCutOffBlur(card.name, e.target.value);
                      setPendingCutOff(prev => { const n = { ...prev }; delete n[card.name]; return n; });
                    }}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        handleCutOffBlur(card.name, e.target.value);
                        setPendingCutOff(prev => { const n = { ...prev }; delete n[card.name]; return n; });
                        e.target.blur();
                      }
                    }}
                  />
                </div>
                <button
                  style={{ ...s.removeBtn, ...(cardTypes.length <= 1 ? s.removeBtnDisabled : {}) }}
                  disabled={cardTypes.length <= 1}
                  onClick={() => onRemoveCard(card.name)}
                  title={cardTypes.length <= 1 ? 'You must have at least one card' : `Remove "${card.name}"`}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        ))}

        <div style={s.divider} />

        {addingCard ? (
          <div style={s.addRow}>
            <input
              type="text"
              placeholder="Card name…"
              style={s.addInput}
              value={newCardName}
              onChange={e => setNewCardName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAddCard(); if (e.key === 'Escape') { setAddingCard(false); setNewCardName(''); } }}
              autoFocus
            />
            <button style={s.addConfirmBtn} onClick={handleAddCard}>Add</button>
            <button style={s.addCancelBtn} onClick={() => { setAddingCard(false); setNewCardName(''); }}>&#x2715;</button>
          </div>
        ) : (
          <button style={s.addBtn} onClick={() => setAddingCard(true)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
            </svg>
            Add card
          </button>
        )}
      </div>

      <p style={s.hint}>
        The cut-off day is optional. Without it, expenses always stay in the transaction's month.
      </p>
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
    marginBottom: 12,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: '50%',
    border: 'none', background: 'var(--bg)',
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: 'var(--text-secondary)', flexShrink: 0,
  },
  title: {
    fontSize: 28, fontWeight: 700, letterSpacing: '-0.5px',
    color: 'var(--text-primary)', margin: 0,
  },
  description: {
    fontSize: 14, color: 'var(--text-secondary)', margin: '0 0 24px',
    lineHeight: 1.6,
  },
  card: {
    background: 'var(--surface)',
    borderRadius: 'var(--radius-md)',
    boxShadow: 'var(--shadow-sm)',
    overflow: 'hidden',
  },
  divider: {
    height: 1, background: 'var(--border)', margin: '0 20px',
  },
  row: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '16px 20px', gap: 12,
  },
  rowLeft: {
    display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0,
  },
  rowRight: {
    display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0,
  },
  cardIcon: {
    width: 36, height: 36, borderRadius: '50%',
    background: 'var(--accent-light)', color: 'var(--accent)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  cardName: {
    fontSize: 15, fontWeight: 600, color: 'var(--text-primary)',
  },
  cutOffGroup: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
  },
  cutOffLabel: {
    fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
    letterSpacing: '0.5px', color: 'var(--text-secondary)',
  },
  cutOffInput: {
    fontFamily: 'inherit', fontSize: 15, fontWeight: 600, textAlign: 'center',
    width: 56, padding: '6px 8px',
    background: 'var(--bg)', border: '1.5px solid var(--border)',
    borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', outline: 'none',
  },
  removeBtn: {
    width: 32, height: 32, borderRadius: '50%', border: 'none',
    background: 'none', cursor: 'pointer', color: 'var(--danger)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  removeBtnDisabled: {
    opacity: 0.3, cursor: 'not-allowed',
  },
  addRow: {
    display: 'flex', alignItems: 'center', gap: 8, padding: '12px 20px',
  },
  addInput: {
    flex: 1, fontFamily: 'inherit', fontSize: 15,
    background: 'var(--bg)', border: '1.5px solid var(--border)',
    borderRadius: 'var(--radius-sm)', padding: '9px 12px',
    color: 'var(--text-primary)', outline: 'none',
  },
  addConfirmBtn: {
    padding: '9px 16px', borderRadius: 'var(--radius-sm)', border: 'none',
    background: 'var(--accent)', color: '#fff', fontSize: 14, fontWeight: 600,
    cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
  },
  addCancelBtn: {
    width: 32, height: 32, borderRadius: '50%', border: 'none',
    background: 'var(--bg)', color: 'var(--text-secondary)',
    cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  addBtn: {
    width: '100%', display: 'flex', alignItems: 'center', gap: 8,
    padding: '16px 20px', border: 'none', background: 'transparent',
    color: 'var(--accent)', fontSize: 15, fontWeight: 600,
    cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
  },
  hint: {
    fontSize: 12, color: 'var(--text-tertiary)', marginTop: 16, lineHeight: 1.5,
  },
  renameInput: {
    fontFamily: 'inherit', fontSize: 14, width: 120,
    background: 'var(--bg)', border: '1.5px solid var(--accent)',
    borderRadius: 'var(--radius-sm)', padding: '5px 8px',
    color: 'var(--text-primary)', outline: 'none',
  },
  renameOkBtn: {
    padding: '5px 10px', borderRadius: 'var(--radius-sm)', border: 'none',
    background: 'var(--accent)', color: '#fff', fontSize: 12, fontWeight: 600,
    cursor: 'pointer', fontFamily: 'inherit',
  },
  renameCancelBtn: {
    width: 26, height: 26, borderRadius: '50%', border: 'none',
    background: 'var(--bg)', color: 'var(--text-secondary)',
    cursor: 'pointer', fontSize: 13,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  renameIconBtn: {
    width: 24, height: 24, borderRadius: '50%', border: 'none',
    background: 'transparent', color: 'var(--text-tertiary)',
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 0,
  },
};
