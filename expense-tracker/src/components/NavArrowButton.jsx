/**
 * NavArrowButton — shared round nav arrow button used across the app.
 *
 * Replaces all text-glyph arrows (&#8249; &#8250; ◂ ▸ ▴ ▾) and the filled
 * Material back-arrow SVG used in settings sub-pages.
 *
 * Props:
 *   direction  — 'left' | 'right' | 'up' | 'down'   (default 'left')
 *   onClick    — click handler
 *   disabled   — boolean; applies opacity + sets real disabled attribute
 *   size       — button diameter in px (default 40)
 *   iconSize   — SVG stroke icon size in px (default 19)
 *   shadow     — whether to show box-shadow (default true; set false for the
 *                collapsed sidebar rail where space is tight)
 *   title      — accessible tooltip string
 *   style      — optional extra style overrides spread on the outer button
 */
export default function NavArrowButton({
  direction = 'left',
  onClick,
  disabled = false,
  size = 40,
  iconSize = 19,
  shadow = true,
  title,
  style,
}) {
  // Chevron polylines — same geometry as DatePicker.jsx (viewBox "0 0 24 24").
  // left:  15 18 9 12 15 6
  // right: 9 18 15 12 9 6
  // up:    18 15 12 9 6 15
  // down:  6 9 12 15 18 9
  const polylines = {
    left:  '15 18 9 12 15 6',
    right: '9 18 15 12 9 6',
    up:    '18 15 12 9 6 15',
    down:  '6 9 12 15 18 9',
  };

  const btnStyle = {
    width: size,
    height: size,
    borderRadius: '50%',
    border: 'none',
    background: 'var(--surface)',
    boxShadow: shadow ? 'var(--shadow-sm)' : 'none',
    color: 'var(--accent)',
    cursor: disabled ? 'default' : 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    opacity: disabled ? 0.3 : 1,
    fontFamily: 'inherit',
    padding: 0,
    transition: 'opacity 0.15s',
    ...style,
  };

  return (
    <button
      type="button"
      style={btnStyle}
      onClick={!disabled ? onClick : undefined}
      disabled={disabled}
      title={title}
    >
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 24 24"
        fill="none"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ stroke: 'currentColor', display: 'block', flexShrink: 0 }}
      >
        <polyline points={polylines[direction] ?? polylines.left} />
      </svg>
    </button>
  );
}
