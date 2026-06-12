import { useState, useRef } from 'react';
import NavArrowButton from './NavArrowButton';

// Same 8-color Apple palette as CardsSettingsPage
const PALETTE = [
  '#007aff', // blue
  '#34c759', // green
  '#ff9500', // orange
  '#ff3b30', // red
  '#af52de', // purple
  '#ff2d55', // pink
  '#5ac8fa', // teal
  '#a2845e', // brown
];

/**
 * FEAT-12: Settings page for managing expense and saving categories.
 * Modeled on CardsSettingsPage — per-section sub-component keeps it focused.
 */
export default function CategoriesSettingsPage({
  expenseCategoryObjects,
  savingCategoryObjects,
  onAddExpenseCategory,
  onRemoveExpenseCategory,
  onRenameExpenseCategory,
  onUpdateExpenseCategoryColor,
  onAddSavingCategory,
  onRemoveSavingCategory,
  onRenameSavingCategory,
  onUpdateSavingCategoryColor,
  onBack,
}) {
  return (
    <div style={s.page}>
      <div style={s.header}>
        <NavArrowButton direction="left" onClick={onBack} title="Back" />
        <h1 style={s.title}>Categories</h1>
      </div>

      <p style={s.description}>
        Add, rename, delete, and color-code your expense and saving categories.
        A category color tints its badge throughout the app. Setting it back to
        &ldquo;default&rdquo; restores the accent styling.
      </p>

      <CategorySection
        sectionTitle="Expense categories"
        categories={expenseCategoryObjects}
        onAdd={onAddExpenseCategory}
        onRemove={onRemoveExpenseCategory}
        onRename={onRenameExpenseCategory}
        onUpdateColor={onUpdateExpenseCategoryColor}
      />

      <div style={s.sectionGap} />

      <CategorySection
        sectionTitle="Saving categories"
        categories={savingCategoryObjects}
        onAdd={onAddSavingCategory}
        onRemove={onRemoveSavingCategory}
        onRename={onRenameSavingCategory}
        onUpdateColor={onUpdateSavingCategoryColor}
      />
    </div>
  );
}

// ── Per-section sub-component ────────────────────────────────────────────────

function CategorySection({
  sectionTitle,
  categories,
  onAdd,
  onRemove,
  onRename,
  onUpdateColor,
}) {
  const [newName,        setNewName]        = useState('');
  const [adding,         setAdding]         = useState(false);
  const [renamingCat,    setRenamingCat]    = useState(null);  // name being renamed
  const [renameValue,    setRenameValue]    = useState('');
  const [colorPickerOpen, setColorPickerOpen] = useState(null); // name or null

  const colorInputRefs = useRef({});

  async function handleAdd() {
    const name = newName.trim();
    if (!name) return;
    try {
      await onAdd(name);
      setNewName('');
      setAdding(false);
    } catch {
      // error surfaced by the App-level wrapper via toast; leave the row open
    }
  }

  async function handleRenameSubmit(oldName) {
    const trimmed = renameValue.trim();
    if (!trimmed || trimmed === oldName) { setRenamingCat(null); return; }
    try {
      await onRename(oldName, trimmed);
      setRenamingCat(null);
    } catch {
      // error surfaced by the App-level wrapper via toast; leave the rename row open
    }
  }

  function toggleColorPicker(name) {
    setColorPickerOpen(prev => (prev === name ? null : name));
  }

  async function handleSelectColor(catName, hex) {
    setColorPickerOpen(null);
    try {
      await onUpdateColor(catName, hex);
    } catch {
      // errors surfaced by the App-level wrapper via toast
    }
  }

  return (
    <div>
      <div style={s.sectionLabel}>{sectionTitle}</div>
      <div style={s.card}>
        {categories.map((cat, i) => (
          <div key={cat.name}>
            {i > 0 && <div style={s.divider} />}
            <div style={s.row}>
              <div style={s.rowLeft}>
                {/* Category icon — tinted when a color is set */}
                <div style={{
                  ...s.catIcon,
                  ...(cat.color ? { background: cat.color + '1A', color: cat.color } : {}),
                }}>
                  {/* Tag/label icon */}
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.63 5.84C17.27 5.33 16.67 5 16 5L5 5.01C3.9 5.01 3 5.9 3 7v10c0 1.1.9 1.99 2 1.99L16 19c.67 0 1.27-.33 1.63-.84L22 12l-4.37-6.16z"/>
                  </svg>
                </div>

                {renamingCat === cat.name ? (
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <input
                      autoFocus
                      style={s.renameInput}
                      value={renameValue}
                      onChange={e => setRenameValue(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleRenameSubmit(cat.name);
                        if (e.key === 'Escape') setRenamingCat(null);
                      }}
                    />
                    <button style={s.renameOkBtn} onClick={() => handleRenameSubmit(cat.name)}>OK</button>
                    <button style={s.renameCancelBtn} onClick={() => setRenamingCat(null)}>&#x2715;</button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={s.catName}>{cat.name}</span>
                    <button
                      style={s.renameIconBtn}
                      title={`Rename "${cat.name}"`}
                      onClick={() => { setRenamingCat(cat.name); setRenameValue(cat.name); }}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                      </svg>
                    </button>
                  </div>
                )}
              </div>

              <div style={s.rowRight}>
                {/* Color well */}
                <div style={s.colorGroup}>
                  <span style={s.colorLabel}>Color</span>
                  <button
                    style={{
                      ...s.colorWell,
                      background: cat.color ?? 'var(--accent)',
                    }}
                    title={`Pick color for "${cat.name}"`}
                    onClick={() => toggleColorPicker(cat.name)}
                    aria-label={`Color for ${cat.name}: ${cat.color ?? 'default'}`}
                    aria-expanded={colorPickerOpen === cat.name}
                  />
                </div>

                <button
                  style={{ ...s.removeBtn, ...(categories.length <= 1 ? s.removeBtnDisabled : {}) }}
                  disabled={categories.length <= 1}
                  onClick={async () => {
                    try { await onRemove(cat.name); }
                    catch { /* error surfaced by the App-level wrapper via toast */ }
                  }}
                  title={categories.length <= 1 ? 'You must have at least one category' : `Remove "${cat.name}"`}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                  </svg>
                </button>
              </div>
            </div>

            {/* Inline swatch picker — shown below the row when open */}
            {colorPickerOpen === cat.name && (
              <div style={s.swatchRow}>
                {PALETTE.map(hex => (
                  <button
                    key={hex}
                    style={{
                      ...s.swatch,
                      background: hex,
                      ...(cat.color === hex ? s.swatchSelected : {}),
                    }}
                    title={hex}
                    onClick={() => handleSelectColor(cat.name, hex)}
                    aria-label={`Color ${hex}`}
                  />
                ))}

                {/* "Clear / default" swatch — sets color to null */}
                <button
                  style={{
                    ...s.swatch,
                    background: 'var(--accent-light)',
                    border: '1.5px solid var(--accent)',
                    ...(cat.color === null ? s.swatchSelected : {}),
                  }}
                  title="Default (accent)"
                  onClick={() => handleSelectColor(cat.name, null)}
                  aria-label="Default color"
                >
                  <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent)', lineHeight: 1 }}>A</span>
                </button>

                {/* Custom / free-pick — rainbow ring + hidden <input type="color"> */}
                <button
                  style={{ ...s.swatch, ...s.swatchCustom }}
                  title="Custom color"
                  onClick={() => colorInputRefs.current[cat.name]?.click()}
                  aria-label="Custom color"
                />
                <input
                  type="color"
                  style={s.hiddenColorInput}
                  ref={el => { colorInputRefs.current[cat.name] = el; }}
                  defaultValue={cat.color ?? '#007aff'}
                  onChange={e => handleSelectColor(cat.name, e.target.value)}
                />
              </div>
            )}
          </div>
        ))}

        <div style={s.divider} />

        {adding ? (
          <div style={s.addRow}>
            <input
              type="text"
              placeholder="Category name…"
              style={s.addInput}
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleAdd();
                if (e.key === 'Escape') { setAdding(false); setNewName(''); }
              }}
              autoFocus
            />
            <button style={s.addConfirmBtn} onClick={handleAdd}>Add</button>
            <button style={s.addCancelBtn} onClick={() => { setAdding(false); setNewName(''); }}>&#x2715;</button>
          </div>
        ) : (
          <button style={s.addBtn} onClick={() => setAdding(true)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
            </svg>
            Add category
          </button>
        )}
      </div>
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
  title: {
    fontSize: 28, fontWeight: 700, letterSpacing: '-0.5px',
    color: 'var(--text-primary)', margin: 0,
  },
  description: {
    fontSize: 14, color: 'var(--text-secondary)', margin: '0 0 24px',
    lineHeight: 1.6,
  },
  sectionLabel: {
    fontSize: 13, fontWeight: 700, textTransform: 'uppercase',
    letterSpacing: '0.5px', color: 'var(--text-secondary)',
    marginBottom: 8,
  },
  sectionGap: { height: 28 },
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
  catIcon: {
    width: 36, height: 36, borderRadius: '50%',
    background: 'var(--accent-light)', color: 'var(--accent)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  catName: {
    fontSize: 15, fontWeight: 600, color: 'var(--text-primary)',
  },
  colorGroup: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
  },
  colorLabel: {
    fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
    letterSpacing: '0.5px', color: 'var(--text-secondary)',
  },
  colorWell: {
    width: 28, height: 28, borderRadius: '50%',
    border: '2px solid var(--border)',
    boxShadow: 'inset 0 0 0 2px var(--surface)',
    cursor: 'pointer', flexShrink: 0, padding: 0,
  },
  removeBtn: {
    width: 32, height: 32, borderRadius: '50%', border: 'none',
    background: 'none', cursor: 'pointer', color: 'var(--danger)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  removeBtnDisabled: {
    opacity: 0.3, cursor: 'not-allowed',
  },
  // ── Swatch picker ────────────────────────────────────────────────────────────
  swatchRow: {
    display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8,
    padding: '10px 20px 14px 20px',
    background: 'var(--surface-2)',
  },
  swatch: {
    width: 28, height: 28, borderRadius: '50%',
    border: '2px solid transparent',
    cursor: 'pointer', padding: 0, flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'transform 0.1s',
  },
  swatchSelected: {
    outline: '2px solid var(--text-primary)',
    outlineOffset: 2,
    transform: 'scale(1.1)',
  },
  swatchCustom: {
    background: 'conic-gradient(red, yellow, lime, cyan, blue, magenta, red)',
    border: '2px solid transparent',
  },
  hiddenColorInput: {
    position: 'absolute', width: 0, height: 0, opacity: 0, pointerEvents: 'none',
  },
  // ── Add row ──────────────────────────────────────────────────────────────────
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
  // ── Rename inline controls ───────────────────────────────────────────────────
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
