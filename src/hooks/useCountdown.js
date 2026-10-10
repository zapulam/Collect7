import { useEffect, useState } from 'react';

// Seconds left until `deadline` (server time), ticking a few times a second.
// `offset` is server time minus this device's clock. Null when there's no deadline.
export function useCountdown(deadline, offset = 0) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!deadline) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [deadline]);
  if (!deadline) return null;
  return Math.max(0, Math.ceil((deadline - (now + offset)) / 1000));
}
