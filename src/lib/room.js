import { isId } from './wire.js';

// Unambiguous characters only (no I, L, O, 0 or 1), so codes are easy to read off a screen.
// Keep in sync with the room id pattern in database.rules.json.
export const ROOM_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const ROOM_LENGTH = 6;

// crypto.getRandomValues works on plain-http LAN addresses too, unlike crypto.randomUUID.
export function randomId(length = 12) {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (b) => (b % 36).toString(36)).join('');
}

export function randomSeed() {
  return crypto.getRandomValues(new Uint32Array(1))[0];
}

export function generateRoomId() {
  const bytes = crypto.getRandomValues(new Uint8Array(ROOM_LENGTH));
  return Array.from(bytes, (b) => ROOM_ALPHABET[b % ROOM_ALPHABET.length]).join('');
}

export function normalizeRoomId(value) {
  const id = String(value ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  return id.length === ROOM_LENGTH && [...id].every((c) => ROOM_ALPHABET.includes(c)) ? id : null;
}

export function buildJoinUrl(roomId) {
  const url = new URL(import.meta.env.BASE_URL, window.location.origin);
  url.searchParams.set('room', roomId);
  return url.toString();
}

function storedId(key) {
  try {
    let id = localStorage.getItem(key);
    if (!isId(id)) {
      id = randomId();
      localStorage.setItem(key, id);
    }
    return id;
  } catch {
    return randomId();
  }
}

// This phone's identity. The clientId is a secret only this phone and the big screen know;
// the playerId is how everyone else refers to the player.
export const getClientId = () => storedId('collect7.clientId');
export const getPlayerId = () => storedId('collect7.playerId');

const NAME_KEY = 'collect7.name';

export function loadName() {
  try {
    return localStorage.getItem(NAME_KEY) ?? '';
  } catch {
    return '';
  }
}

export function saveName(name) {
  try {
    localStorage.setItem(NAME_KEY, name);
  } catch {
    // Storage unavailable: the name just isn't prefilled next time.
  }
}

// The big screen keeps the whole game (deck order included) in localStorage, so a refresh,
// a closed tab or a browser restart can pick the game back up.
const HOST_KEY = 'collect7.host';

export function loadHostSession() {
  try {
    const saved = JSON.parse(localStorage.getItem(HOST_KEY) ?? 'null');
    const roomId = normalizeRoomId(saved?.roomId);
    const state = saved?.state;
    if (!roomId || !state || typeof state !== 'object' || !Array.isArray(state.order)) return null;
    return { roomId, state, savedAt: Number(saved.savedAt) || 0 };
  } catch {
    return null;
  }
}

export function saveHostSession(session) {
  try {
    if (session) localStorage.setItem(HOST_KEY, JSON.stringify({ ...session, savedAt: Date.now() }));
    else localStorage.removeItem(HOST_KEY);
  } catch {
    // Storage unavailable (private mode): a refresh starts a new game.
  }
}
