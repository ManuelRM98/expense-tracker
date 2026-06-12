import { useState, useEffect } from 'react';

/**
 * Single source of truth for the mobile breakpoint.
 * All mobile-gated branches in the app must import MOBILE_BREAKPOINT from here
 * — never hard-code 640 elsewhere.
 */
export const MOBILE_BREAKPOINT = 640;

/**
 * Returns true when the viewport is at or below MOBILE_BREAKPOINT pixels wide.
 * Uses window.matchMedia with a change listener so it updates on resize.
 */
export default function useIsMobile() {
  const query = `(max-width: ${MOBILE_BREAKPOINT}px)`;
  const [isMobile, setIsMobile] = useState(() => window.matchMedia(query).matches);

  useEffect(() => {
    const mql = window.matchMedia(query);
    const handler = (e) => setIsMobile(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [query]);

  return isMobile;
}
