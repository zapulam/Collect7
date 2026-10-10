export default function Screen({ children, center = true }) {
  return (
    <main
      className={`min-h-dvh text-gray-100 select-none [touch-action:manipulation] [-webkit-touch-callout:none] px-5 pt-[max(env(safe-area-inset-top),1.25rem)] pb-[max(env(safe-area-inset-bottom),1.25rem)] ${
        center ? 'flex flex-col items-center justify-center text-center gap-5' : ''
      }`}
    >
      {children}
    </main>
  );
}

export function Spinner({ label }) {
  return (
    <Screen>
      <div className="h-10 w-10 rounded-full border-4 border-indigo-400 border-r-transparent animate-spin" />
      <p className="text-gray-400">{label}</p>
    </Screen>
  );
}

