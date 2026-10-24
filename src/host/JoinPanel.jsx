import { Check, Copy } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useState } from 'react';
import { buildJoinUrl } from '../lib/room';

// The QR code, room code and link phones use to join.
export default function JoinPanel({ roomId, size = 'min(340px, 46dvh)' }) {
  const url = buildJoinUrl(roomId);
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard
      ?.writeText(url)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
      })
      .catch(() => {});
  };
  return (
    <div className="grid gap-4 justify-items-center text-center">
      <div className="bg-white rounded-3xl p-4 shadow-2xl shadow-black/50" style={{ width: size, aspectRatio: '1 / 1' }}>
        <QRCodeSVG
          value={url}
          level="M"
          marginSize={1}
          bgColor="#ffffff"
          fgColor="#111827"
          title={`Join link for room ${roomId}`}
          style={{ width: '100%', height: '100%' }}
        />
      </div>
      <div>
        <div className="text-xs uppercase tracking-[0.2em] text-gray-400">Room code</div>
        <div className="font-mono font-bold text-4xl tracking-[0.18em] text-white" data-testid="room-code">
          {roomId}
        </div>
      </div>
      <button
        type="button"
        onClick={copy}
        className="inline-flex max-w-full items-center gap-2 rounded-lg bg-white/5 px-3 py-1.5 text-sm text-gray-300 hover:bg-white/10"
        title="Copy join link"
      >
        <span className="truncate">{url.replace(/^https?:\/\//, '')}</span>
        {copied ? <Check size={14} className="text-emerald-400 shrink-0" /> : <Copy size={14} className="shrink-0" />}
      </button>
    </div>
  );
}
