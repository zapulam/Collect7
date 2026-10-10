import { useEffect } from 'react';

// On the big screen: when the pending decision's deadline passes, resolve it for the player.
export function useTurnTimeout(round, phase, act, offset) {
  const deadline = phase === 'playing' && round?.pending ? round.deadline : null;
  const turnSeq = round?.turnSeq;
  useEffect(() => {
    if (!deadline) return;
    const wait = Math.max(0, deadline - (Date.now() + offset));
    const id = setTimeout(() => act({ type: 'timeout', turnSeq }), wait + 150);
    return () => clearTimeout(id);
  }, [deadline, turnSeq, offset, act]);
}
