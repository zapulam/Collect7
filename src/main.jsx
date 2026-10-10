import React, { Suspense, lazy } from 'react';
import ReactDOM from 'react-dom/client';
import './tailwind.css';
import './styles/fx.css';

// A ?room= link (from the QR code) opens a player's phone view instead of the big screen.
// Each is loaded on its own, so phones don't download the board and vice versa.
const room = new URLSearchParams(window.location.search).get('room');
const HostApp = lazy(() => import('./host/HostApp'));
const PhoneApp = lazy(() => import('./phone/PhoneApp'));

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Suspense fallback={<div className="min-h-dvh" />}>
      {room !== null ? <PhoneApp initialRoom={room} /> : <HostApp />}
    </Suspense>
  </React.StrictMode>
);
