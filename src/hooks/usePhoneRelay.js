import { useEffect, useState } from 'react';
import { openPhoneRoom } from '../lib/relay';

const INITIAL = { loaded: false, exists: false, game: null, hostOnline: false, offset: 0 };

// Follows a room from a phone. Returns { loaded, exists, game, hostOnline, offset, handle, failed }.
export function usePhoneRelay(roomId) {
  const [room, setRoom] = useState(INITIAL);
  const [handle, setHandle] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!roomId) return;
    let closed = false;
    let opened = null;
    setRoom(INITIAL);
    setFailed(false);
    openPhoneRoom(roomId, {
      onRoom: (next) => {
        if (!closed) setRoom(next);
      },
    }).then(
      (h) => {
        opened = h;
        if (closed) h.close();
        else setHandle(h);
      },
      (error) => {
        console.error(error);
        if (!closed) setFailed(true);
      }
    );
    return () => {
      closed = true;
      opened?.close();
      setHandle(null);
    };
  }, [roomId]);

  return { ...room, handle, failed };
}
