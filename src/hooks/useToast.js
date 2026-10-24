import { useCallback, useEffect, useRef, useState } from 'react';

// Short-lived messages at the bottom of the screen.
export function useToast() {
  const [toast, setToast] = useState(null);
  const timer = useRef(null);
  const show = useCallback((text, tone = 'info') => {
    clearTimeout(timer.current);
    setToast({ text, tone, id: Date.now() });
    timer.current = setTimeout(() => setToast(null), 2600);
  }, []);
  useEffect(() => () => clearTimeout(timer.current), []);
  return [toast, show];
}

