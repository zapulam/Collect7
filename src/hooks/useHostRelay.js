import { useEffect, useRef, useState } from 'react';
import { openHostRoom } from '../lib/relay';
import { randomId } from '../lib/room';
import { sanitizeRequest } from '../lib/wire';

// One id per page load, so a duplicated tab can tell itself apart from the original.
const TAB_ID = randomId();
const NOBODY = new Set();

// Hosts the game in a Firebase room: mirrors `view` (the public game) to the room and
// hands each valid phone request to `onAction`. Status: off | connecting | live | superseded | error,
// or denied when the database accepts the room but its rules reject the game itself.
export function useHostRelay({ roomId, view, onAction, onOffset }) {
  const [handle, setHandle] = useState(null);
  const [status, setStatus] = useState('connecting');
  const [denied, setDenied] = useState(false);
  const [online, setOnline] = useState({ roomId: null, ids: NOBODY });
  const [attempt, setAttempt] = useState(0);
  const callbacks = useRef({ onAction, onOffset });
  callbacks.current = { onAction, onOffset };
  // Lets the cleanup tell "switched to a new room" (delete the old one) from other teardowns.
  const currentRoomId = useRef(roomId);
  currentRoomId.current = roomId;

  useEffect(() => {
    if (!roomId) return;
    let closed = false;
    let room = null;
    setStatus('connecting');
    setDenied(false);
    openHostRoom(roomId, {
      tabId: TAB_ID,
      onPublish: (error) => {
        if (!closed) setDenied(String(error?.code ?? error?.message ?? '').includes('PERMISSION_DENIED'));
      },
      onRequest: (raw) => {
        const action = sanitizeRequest(raw);
        if (action && !closed) callbacks.current.onAction(action);
      },
      onPresence: (ids) => {
        if (!closed) setOnline({ roomId, ids });
      },
      onOffset: (offset) => callbacks.current.onOffset(offset),
      onSuperseded: () => {
        if (closed) return;
        setHandle(null);
        setStatus('superseded');
      },
    }).then(
      (opened) => {
        room = opened;
        if (closed) {
          opened.close();
        } else if (!opened.superseded) {
          setHandle(opened);
          setStatus('live');
        }
      },
      (error) => {
        console.error(error);
        if (!closed) setStatus('error');
      }
    );
    return () => {
      closed = true;
      room?.close({ retire: currentRoomId.current !== roomId });
      setHandle(null);
    };
  }, [roomId, attempt]);

  useEffect(() => {
    handle?.publish(view);
  }, [handle, view]);

  return {
    status: !roomId ? 'off' : status === 'live' && denied ? 'denied' : status,
    online: online.roomId === roomId ? online.ids : NOBODY,
    retry: () => setAttempt((n) => n + 1),
  };
}
