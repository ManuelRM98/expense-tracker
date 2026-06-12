/**
 * BottomTabBar — iOS-style fixed bottom navigation for mobile (≤ 640px).
 * Desktop: not rendered (gated in App.jsx via useIsMobile).
 *
 * Props:
 *   view           — current active view name (matches parsePath output)
 *   onHome         — navigate to annual summary
 *   onOpenMonths   — open the month-picker sheet
 *   onOpenDebts    — navigate to debts
 *   onOpenSettings — navigate to settings
 */

const TAB_H = 56; // px — must match --tab-bar-h in index.css

const HomeIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
    <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
  </svg>
);

const MonthsIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
  </svg>
);

const DebtsIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
    <path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/>
  </svg>
);

const SettingsIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.14 12.94c.04-.3.06-.61.06-.94s-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.49.49 0 0 0-.59-.22l-2.39.96a7.02 7.02 0 0 0-1.62-.94l-.36-2.54a.484.484 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.49.49 0 0 0-.59.22L2.74 8.87a.48.48 0 0 0 .12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32a.49.49 0 0 0-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
  </svg>
);

function TabItem({ icon, label, active, onClick }) {
  return (
    <button
      style={{
        ...s.tab,
        color: active ? 'var(--accent)' : 'var(--text-tertiary)',
      }}
      onClick={onClick}
      type="button"
    >
      <span style={{ lineHeight: 0 }}>{icon}</span>
      <span style={s.tabLabel}>{label}</span>
    </button>
  );
}

export default function BottomTabBar({ view, onHome, onOpenMonths, onOpenDebts, onOpenSettings }) {
  const isMonth = view === 'month';

  return (
    <nav style={s.bar} role="navigation" aria-label="Bottom navigation">
      <TabItem
        icon={<HomeIcon />}
        label="Home"
        active={view === 'home'}
        onClick={onHome}
      />
      <TabItem
        icon={<MonthsIcon />}
        label="Months"
        active={isMonth}
        onClick={onOpenMonths}
      />
      <TabItem
        icon={<DebtsIcon />}
        label="Debts"
        active={view === 'debts'}
        onClick={onOpenDebts}
      />
      <TabItem
        icon={<SettingsIcon />}
        label="Settings"
        active={view === 'settings' || view === 'cards' || view === 'categories' || view === 'budgetAllocation' || view === 'globalSalary' || view === 'permanentFixed'}
        onClick={onOpenSettings}
      />
    </nav>
  );
}

const s = {
  bar: {
    position: 'fixed',
    // Float above the home indicator: bottom = gap + safe-area-inset-bottom
    bottom: 'calc(var(--tab-bar-gap) + env(safe-area-inset-bottom))',
    // Side insets so the pill detaches from the screen edges
    left: 'calc(16px + env(safe-area-inset-left))',
    right: 'calc(16px + env(safe-area-inset-right))',
    // Frosted glass — dedicated semi-transparent token so the blur reads visibly.
    // overflow:hidden is intentionally absent: combining it with backdrop-filter +
    // border-radius on the same element drops the blur in Chromium/WebKit.
    // border-radius already clips the visual region; nothing pokes out of the corners.
    background: 'var(--tab-bar-glass)',
    backdropFilter: 'saturate(180%) blur(24px)',
    WebkitBackdropFilter: 'saturate(180%) blur(24px)',
    // All-sides border for the detached pill
    border: '1px solid var(--panel-edge)',
    // Fully rounded pill + glassy top inner highlight + floating shadow
    borderRadius: 999,
    boxShadow:
      'inset 0 1px 0 var(--tab-bar-highlight), var(--tab-bar-float-shadow)',
    display: 'flex',
    alignItems: 'stretch',
    // Bar is exactly TAB_H tall — no extra safe-area padding because it floats above
    height: TAB_H,
    zIndex: 150,
  },
  tab: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    fontFamily: 'inherit',
    // >= 44px touch target (the bar itself is 56px, this fills it)
    minHeight: 44,
    padding: '6px 0',
    transition: 'color 0.15s',
    WebkitTapHighlightColor: 'transparent',
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: '0.2px',
    lineHeight: 1,
  },
};
