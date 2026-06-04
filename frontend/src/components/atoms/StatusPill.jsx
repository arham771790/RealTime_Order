const toneClassNames = {
  connected: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  pending: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  shipped: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  delivered: "border-teal-500/30 bg-teal-500/10 text-teal-700 dark:text-teal-300",
  neutral:
    "border-zinc-300 bg-white text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
};

export default function StatusPill({ label, tone = "neutral" }) {
  return (
    <span
      className={`inline-flex items-center border px-2.5 py-1 text-xs font-medium ${toneClassNames[tone]}`}
    >
      {label}
    </span>
  );
}
