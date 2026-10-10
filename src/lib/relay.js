// Talks to Firebase Realtime Database so phones can reach the big screen.
//
// rooms/{roomId}/
//   meta      { v, createdAt }                      written when the big screen opens the room
//   host      { tabId, at }                         the big screen's presence
//   presence  { [playerId]: { [connectionId]: { at } } }   phones that are online
//   game      the public game, written only by the big screen (wire.js publicView)
//   requests  { [pushId]: { type, clientId, playerId, gameId, ... , at } }  pushed by phones
import { activeFirebaseConfig, emulatorHost } from './firebaseConfig.js';
import { getClientId, getPlayerId, randomId } from './room.js';
import { fromWire, toWire } from './wire.js';

let sdkPromise = null;

function loadSdk() {
  if (!sdkPromise) {
    sdkPromise = Promise.all([import('firebase/app'), import('firebase/database')]).then(([app, database]) => {
      const firebaseApp = app.getApps().length ? app.getApp() : app.initializeApp(activeFirebaseConfig);
      const db = database.getDatabase(firebaseApp);
      if (emulatorHost) {
        const [host, port] = emulatorHost.split(':');
        try {
          database.connectDatabaseEmulator(db, host, Number(port));
        } catch {
          // Already connected (after a hot reload).
        }
      }
      return { db, ...database };
    });
  }
  return sdkPromise;
}

// Writes a presence value now and after every reconnect, and has the server remove it
// when the connection drops. Returns stop(mode) to stop maintaining it:
//   "remove" (default) cancels the disconnect cleanup and removes the value now,
//   "keep"   cancels the disconnect cleanup but leaves the value (it may be someone else's),
//   "detach" leaves both, for when another copy in this tab still relies on them.
function keepPresent(sdk, path, value) {
  const { db, ref, onValue, onDisconnect, set, remove, serverTimestamp } = sdk;
  const node = ref(db, path);
  let active = true;
  const unsubscribe = onValue(ref(db, '.info/connected'), (snap) => {
    if (snap.val() !== true || !active) return;
    onDisconnect(node)
      .remove()
      .then(() => active && set(node, { ...value, at: serverTimestamp() }))
      .catch(console.error);
  });
  return (mode = 'remove') => {
    if (!active) return;
    active = false;
    unsubscribe();
    if (mode === 'detach') return;
    onDisconnect(node).cancel().catch(() => {});
    if (mode === 'remove') remove(node).catch(() => {});
  };
}

// Server time minus local time, so every screen counts down to the same deadline.
function watchServerOffset(sdk, onOffset) {
  return sdk.onValue(sdk.ref(sdk.db, '.info/serverTimeOffset'), (snap) => onOffset(Number(snap.val()) || 0));
}

// How many host connections this tab has open per room. React's development mode opens a
// second one before closing the first; only the last to close may clear the presence,
// or a closing copy could wipe the live one's entry (and its disconnect cleanup).
const openHosts = new Map();

// The big screen. Phone requests are removed as soon as they arrive and handed to
// onRequest. If another tab takes over the room, this one stops and calls onSuperseded.
export async function openHostRoom(roomId, { tabId, onRequest, onPresence, onOffset, onSuperseded }) {
  openHosts.set(roomId, (openHosts.get(roomId) ?? 0) + 1);
  const release = () => {
    const remaining = openHosts.get(roomId) - 1;
    if (remaining > 0) openHosts.set(roomId, remaining);
    else openHosts.delete(roomId);
    return remaining;
  };
  let sdk;
  try {
    sdk = await loadSdk();
    await sdk.update(sdk.ref(sdk.db, `rooms/${roomId}`), { meta: { v: 1, createdAt: sdk.serverTimestamp() } });
  } catch (error) {
    release();
    throw error;
  }
  const { db, ref, set, remove, onValue, onChildAdded, onDisconnect, serverTimestamp } = sdk;
  const room = `rooms/${roomId}`;

  let closed = false;
  let claimed = false;
  let superseded = false;
  const unsubscribes = [];
  const stopHost = keepPresent(sdk, `${room}/host`, { tabId });

  const close = ({ retire = false } = {}) => {
    if (closed) return;
    closed = true;
    unsubscribes.forEach((unsubscribe) => unsubscribe());
    const othersOpen = release() > 0;
    stopHost(superseded || retire ? 'keep' : othersOpen ? 'detach' : 'remove');
    // Retiring a room (New game) deletes it, so phones still on it see "Game not found".
    if (retire) remove(ref(db, room)).catch(console.error);
  };

  const hostRef = ref(db, `${room}/host`);
  unsubscribes.push(
    onValue(hostRef, (snap) => {
      const host = snap.val();
      if (host?.tabId === tabId) {
        claimed = true;
      } else if (!host) {
        // An earlier connection's cleanup can land after we claimed (a reload, or a quick
        // close and reopen in this tab, which may also cancel our disconnect hook): reclaim.
        if (claimed && !closed) {
          onDisconnect(hostRef)
            .remove()
            .then(() => !closed && set(hostRef, { tabId, at: serverTimestamp() }))
            .catch(console.error);
        }
      } else if (claimed && !closed) {
        superseded = true;
        close();
        onSuperseded();
      }
    })
  );

  unsubscribes.push(
    onValue(ref(db, `${room}/presence`), (snap) => {
      const online = new Set();
      snap.forEach((child) => {
        if (child.hasChildren()) online.add(child.key);
      });
      onPresence(online);
    })
  );

  unsubscribes.push(watchServerOffset(sdk, onOffset));

  unsubscribes.push(
    onChildAdded(ref(db, `${room}/requests`), (snap) => {
      remove(snap.ref).catch(console.error);
      onRequest(snap.val());
    })
  );

  return {
    publish(view) {
      if (!closed) set(ref(db, `${room}/game`), toWire(view)).catch(console.error);
    },
    close,
    get superseded() {
      return superseded;
    },
  };
}

// A player's phone. onRoom receives { loaded, exists, game, hostOnline, offset } on every change.
export async function openPhoneRoom(roomId, { onRoom }) {
  const sdk = await loadSdk();
  const { db, ref, set, push, remove, onValue, serverTimestamp } = sdk;
  const room = `rooms/${roomId}`;
  const clientId = getClientId();
  const playerId = getPlayerId();

  let state = { loaded: false, exists: false, game: null, hostOnline: false, offset: 0 };
  const emit = (patch) => {
    state = { ...state, ...patch };
    onRoom(state);
  };
  const unsubscribes = [
    onValue(
      ref(db, `${room}/meta`),
      (snap) => emit({ loaded: true, exists: snap.exists() }),
      () => emit({ loaded: true, exists: false })
    ),
    onValue(ref(db, `${room}/game`), (snap) => emit({ game: fromWire(snap.val()) })),
    onValue(ref(db, `${room}/host`), (snap) => emit({ hostOnline: snap.exists() })),
    watchServerOffset(sdk, (offset) => emit({ offset })),
  ];
  // One presence entry per page load, so a reload's late disconnect cleanup
  // can't remove the new page's entry.
  const stopPresence = keepPresent(sdk, `${room}/presence/${playerId}/${randomId()}`, {});

  return {
    clientId,
    playerId,
    // request: { type: 'join', name } | { type: 'hit' | 'stay', turnSeq } | { type: 'choose', turnSeq, target }
    sendRequest(request) {
      const node = push(ref(db, `${room}/requests`));
      set(node, { ...request, clientId, playerId, at: serverTimestamp() }).catch(console.error);
      return node.key;
    },
    cancelRequest(key) {
      remove(ref(db, `${room}/requests/${key}`)).catch(() => {});
    },
    close() {
      unsubscribes.forEach((unsubscribe) => unsubscribe());
      stopPresence();
    },
  };
}
