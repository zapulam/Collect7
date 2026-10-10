import { useEffect } from 'react';

// Keeps the screen awake while the game is up (re-requested when the tab comes back).
export function useWakeLock(enabled = true) {
  useEffect(() => {
    if (!enabled || !navigator.wakeLock) return;
    let lock = null;
    let cancelled = false;
    const request = () => {
      if (document.visibilityState !== 'visible') return;
      navigator.wakeLock
        .request('screen')
        .then((l) => {
          if (cancelled) l.release();
          else lock = l;
        })
        .catch(() => {});
    };
    request();
    document.addEventListener('visibilitychange', request);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', request);
      lock?.release().catch(() => {});
    };
  }, [enabled]);
}
