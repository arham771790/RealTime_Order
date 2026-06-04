const navItems = ["Dashboard", "Orders", "Events", "Subscriptions"];

export default function AppShell({ children }) {
  return (
    <main className="min-h-screen bg-zinc-100 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-100">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 border-r border-zinc-200 bg-white px-5 py-6 dark:border-zinc-800 dark:bg-zinc-950 lg:block">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-emerald-600 dark:text-emerald-300">
              Payflow Ops
            </p>
            <h1 className="mt-3 text-xl font-semibold text-zinc-950 dark:text-white">
              Orders Live
            </h1>
          </div>
          <nav className="mt-10 space-y-1">
            {navItems.map((item) => (
              <a
                className={`block border px-3 py-2 text-sm font-medium ${
                  item === "Dashboard"
                    ? "border-zinc-950 bg-zinc-950 text-white dark:border-white dark:bg-white dark:text-zinc-950"
                    : "border-transparent text-zinc-500 hover:border-zinc-200 hover:text-zinc-950 dark:text-zinc-400 dark:hover:border-zinc-800 dark:hover:text-white"
                }`}
                href="#dashboard"
                key={item}
              >
                {item}
              </a>
            ))}
          </nav>
        </aside>
        <section className="min-w-0 flex-1">
          <header className="border-b border-zinc-200 bg-white px-5 py-4 dark:border-zinc-800 dark:bg-zinc-950 sm:px-8">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                  Real-Time Orders System
                </p>
                <h2 className="mt-1 text-2xl font-semibold text-zinc-950 dark:text-white">
                  Operations Dashboard
                </h2>
              </div>
              <div className="text-sm text-zinc-500 dark:text-zinc-400">localhost:3000</div>
            </div>
          </header>
          {children}
        </section>
      </div>
    </main>
  );
}
