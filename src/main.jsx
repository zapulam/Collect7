import React, { Suspense, lazy } from 'react';
import ReactDOM from 'react-dom/client';
import './tailwind.css';
import './styles/fx.css';

// A ?room= link (from the QR code) opens a player's phone view instead of the big screen.
// Each is loaded on its own, so phones don't download the board and vice versa.
const params = new URLSearchParams(window.location.search);
const room = params.get('room');
const HostApp = lazy(() => import('./host/HostApp'));
const PhoneApp = lazy(() => import('./phone/PhoneApp'));
// /?preview shows the phone UI against a local fake game. Development only; the production
// build drops it.
const Preview = import.meta.env.DEV && params.has('preview') ? lazy(() => import('./phone/Preview')) : null;

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Suspense fallback={<div className="min-h-dvh" />}>
      {Preview ? <Preview /> : room !== null ? <PhoneApp initialRoom={room} /> : <HostApp />}
    </Suspense>
  </React.StrictMode>
);
