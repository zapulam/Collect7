import { useEffect } from 'react';

// A centred dialog over a dimmed backdrop. Esc or a backdrop click calls onClose (if given).
export default function Modal({ children, onClose, labelledBy, className = '' }) {
  useEffect(() => {
    if (!onClose) return;
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/65 backdrop-blur-sm p-4 c7-fade-in"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className={`c7-pop max-h-[94dvh] overflow-y-auto rounded-3xl border border-white/10 bg-gray-900/95 shadow-2xl ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
