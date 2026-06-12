/** Drag handle affordance shown at top of mobile bottom-sheet modals. */
export function DragHandle() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', paddingBottom: 12 }}>
      <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--border)' }} />
    </div>
  );
}
