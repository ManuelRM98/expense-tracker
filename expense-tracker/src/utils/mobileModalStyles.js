/**
 * mobileModalStyles.js — shared style helpers for modals on mobile vs desktop.
 *
 * On desktop: centered overlay with max-width card (existing design).
 * On mobile (≤ 640px): full-screen sheet — covers the whole viewport so the
 *   user can see all form fields without fighting the keyboard. Safe-area
 *   padding applied at top (notch) and bottom (home indicator).
 *
 * Usage:
 *   import { getModalOverlayStyle, getModalStyle } from '../utils/mobileModalStyles';
 *   const overlayStyle = getModalOverlayStyle(isMobile);
 *   const modalStyle   = getModalStyle(isMobile, { maxWidth: 500 });
 */

export function getModalOverlayStyle(isMobile) {
  return {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.42)',
    backdropFilter: 'blur(4px)',
    WebkitBackdropFilter: 'blur(4px)',
    zIndex: 200,
    display: 'flex',
    // Desktop: center; Mobile: stretch to fill from the bottom
    alignItems: isMobile ? 'flex-end' : 'center',
    justifyContent: 'center',
    padding: isMobile ? 0 : 20,
  };
}

export function getModalStyle(isMobile, overrides = {}) {
  if (isMobile) {
    return {
      background: 'var(--surface)',
      borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0',
      boxShadow: 'var(--shadow-lg)',
      width: '100%',
      maxHeight: '92dvh',
      overflowY: 'auto',
      paddingTop: 8,
      paddingLeft: 20,
      paddingRight: 20,
      paddingBottom: 'env(safe-area-inset-bottom)',
      animation: 'sheetSlideUp .28s cubic-bezier(0.32,0.72,0,1)',
      ...overrides,
    };
  }
  return {
    background: 'var(--surface)',
    borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--shadow-lg)',
    width: '100%',
    maxWidth: overrides.maxWidth ?? 500,
    padding: 28,
    animation: 'modalIn .22s cubic-bezier(.34,1.56,.64,1)',
    ...overrides,
  };
}
