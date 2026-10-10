import { useEffect, useRef, useState } from 'react';
import { describeEvent, TONE_STYLES } from '../lib/describe';

const SHOW_MS = 5000;

// Announces new game events as banners that fade after a few seconds. Events that were
// already in the log when this mounted (say, after a refresh) aren't replayed.
// onEvent(event) is called once for every new event, announced or not.
export default function EventFeed({ log, name, meId, max = 3, onEvent, className = '' }) {
  const seen = useRef(log.at(-1)?.id ?? 0);
  const [items, setItems] = useState([]);
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    const fresh = log.filter((e) => e.id > seen.current);
    if (!fresh.length) return;
    seen.current = fresh.at(-1).id;
    const now = Date.now();
    const added = [];
    for (const event of fresh) {
      onEventRef.current?.(event);
      const described = describeEvent(event, name, meId);
      if (described) added.push({ ...described, id: event.id, at: now });
    }
    if (added.length) setItems((current) => [...current, ...added].slice(-max));
  }, [log, name, meId, max]);

  useEffect(() => {
    if (!items.length) return;
    const next = Math.min(...items.map((item) => item.at)) + SHOW_MS - Date.now();
    const id = setTimeout(() => setItems((current) => current.filter((item) => Date.now() - item.at < SHOW_MS)), Math.max(50, next));
    return () => clearTimeout(id);
  }, [items]);

  return (
    <div className={`pointer-events-none flex flex-col items-center gap-2 ${className}`} aria-live="polite">
      {items.map((item) => (
        <div
          key={item.id}
          className={`c7-banner rounded-full border px-5 py-2 text-center font-semibold shadow-xl shadow-black/40 ${TONE_STYLES[item.tone]}`}
        >
          {item.text}
        </div>
      ))}
    </div>
  );
}
