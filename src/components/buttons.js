const base =
  'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-150 active:scale-95 disabled:opacity-40 disabled:pointer-events-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-300';

export const primaryButton = `${base} px-6 py-3 text-white bg-gradient-to-r from-indigo-500 to-fuchsia-500 hover:brightness-110 shadow-lg shadow-fuchsia-900/30`;
export const secondaryButton = `${base} px-5 py-2.5 text-gray-100 bg-white/10 hover:bg-white/15 border border-white/10`;
export const dangerButton = `${base} px-5 py-2.5 text-white bg-red-600 hover:bg-red-500`;
export const chipButton = (selected) =>
  `${base} px-3.5 py-2 text-sm ${selected ? 'bg-indigo-500 text-white shadow shadow-indigo-900/50' : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-white/10'}`;
