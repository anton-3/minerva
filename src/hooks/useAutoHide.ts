// useAutoHide — Auto-hiding controls with manual reveal tab
// Controls fade out after 2s of inactivity. Mouse movement does NOT bring them back.
// A small floating tab stays visible — clicking it reveals controls for another 2s.
// lock()/unlock() prevent hiding while hovering controls or when a dropdown is open.

import { useState, useEffect, useRef, useCallback } from "react";

const AUTO_HIDE_DELAY = 2000;

export function useAutoHide(enabled: boolean) {
  const [visible, setVisible] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lockedRef = useRef(false);
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  const startHideTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!lockedRef.current && enabledRef.current) {
      timerRef.current = setTimeout(() => setVisible(false), AUTO_HIDE_DELAY);
    }
  }, []);

  // Called when user clicks the reveal tab
  const show = useCallback(() => {
    setVisible(true);
    startHideTimer();
  }, [startHideTimer]);

  const lock = useCallback(() => {
    lockedRef.current = true;
    setVisible(true);
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const unlock = useCallback(() => {
    lockedRef.current = false;
    startHideTimer();
  }, [startHideTimer]);

  // When enabled changes: show controls then start hide timer
  useEffect(() => {
    if (!enabled) {
      setVisible(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }

    // Auto-hide after initial delay when session becomes active
    setVisible(true);
    timerRef.current = setTimeout(() => setVisible(false), AUTO_HIDE_DELAY);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [enabled]);

  return { visible, show, lock, unlock };
}
