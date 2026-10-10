export default function Wordmark({ className = '' }) {
  return (
    <span className={`font-black tracking-tight ${className}`}>
      <span className="bg-gradient-to-r from-amber-300 via-pink-400 to-indigo-400 bg-clip-text text-transparent">Collect</span>
      <span className="ml-0.5 inline-block -rotate-6 rounded-md bg-indigo-600 px-1.5 text-white shadow-md shadow-indigo-950/60">7</span>
    </span>
  );
}
