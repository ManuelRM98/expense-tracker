import * as sharedStyles from '../styles/shared';

/**
 * Shared pill-style tab button used in segmented tab bars throughout the app.
 * Pair with sharedStyles.tabBar as the container.
 *
 * Props:
 *   label   {string}  — visible tab text
 *   active  {boolean} — whether this tab is currently selected
 *   onClick {Function}
 *   color   {string}  — CSS color for the active background (defaults to var(--accent))
 */
export default function TabBtn({ label, active, onClick, color }) {
  const activeColor = color ?? 'var(--accent)';
  return (
    <button
      style={{ ...sharedStyles.tabBtn, ...(active ? { background: activeColor, color: '#fff', fontWeight: 600 } : {}) }}
      onClick={onClick}
    >
      {label}
    </button>
  );
}
