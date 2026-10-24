// Collect7's Firebase project. Only the Realtime Database is used and there's no sign-in,
// so the project id and database URL are all the app needs (see README > Firebase setup).
export const firebaseConfig = {
  projectId: "collect7-b4930",
  databaseURL: "https://collect7-b4930-default-rtdb.firebaseio.com",
};

// Local development against the database emulator: set VITE_FIREBASE_EMULATOR to a port
// (the emulator then runs on the same host as the page, so phones on the LAN reach it)
// or to host:port.
const emulator = import.meta.env.DEV ? import.meta.env.VITE_FIREBASE_EMULATOR : "";
export const emulatorHost = !emulator
  ? null
  : emulator.includes(":")
    ? emulator
    : `${window.location.hostname}:${emulator}`;

export const activeFirebaseConfig = emulatorHost
  ? { projectId: "demo-collect7", databaseURL: "https://demo-collect7-default-rtdb.firebaseio.com" }
  : firebaseConfig;

export const relayConfigured = Boolean(activeFirebaseConfig.projectId && activeFirebaseConfig.databaseURL);
