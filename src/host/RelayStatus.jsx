import { RefreshCw } from 'lucide-react';

// A small pill showing whether phones can reach this screen.
export default function RelayStatus({ relay }) {
  if (relay.status === 'live') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-emerald-300">
        <span className="h-2 w-2 rounded-full bg-emerald-400" /> Live
      </span>
    );
  }
  if (relay.status === 'connecting') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-gray-400">
        <span className="h-2 w-2 rounded-full bg-gray-500 animate-pulse" /> Connecting…
      </span>
    );
  }
  if (relay.status === 'superseded') {
    return <span className="text-xs text-amber-300">This game is now running in another tab.</span>;
  }
  if (relay.status === 'error') {
    return (
      <button type="button" onClick={relay.retry} className="inline-flex items-center gap-1.5 text-xs text-red-300 hover:text-red-200">
        <RefreshCw size={12} /> Couldn&apos;t connect. Retry
      </button>
    );
  }
  return null;
}
