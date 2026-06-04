export default function SummaryCard({ accentClassName, helper, isLoading = false, label, value }) {
  return (
    <article className="border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{label}</p>
          <p className="mt-3 text-3xl font-semibold text-zinc-950 dark:text-white">
            {isLoading ? (
              <span className="inline-block h-9 w-16 animate-pulse bg-zinc-200 dark:bg-zinc-800" />
            ) : (
              value
            )}
          </p>
        </div>
        <span className={`mt-1 h-10 w-1.5 ${accentClassName}`} />
      </div>
      <p className="mt-5 text-sm text-zinc-500 dark:text-zinc-400">{helper}</p>
    </article>
  );
}
