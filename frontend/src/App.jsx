export default function App() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <section className="mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center px-6 py-12">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-300">
          Real-Time Orders
        </p>
        <div className="mt-4 max-w-3xl">
          <h1 className="text-4xl font-semibold tracking-normal text-white sm:text-5xl">
            Live order operations dashboard
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300">
            Frontend scaffold is ready. The next frontend commits will add dashboard cards, order
            tables, websocket state, event feeds, subscriptions, and demo controls.
          </p>
        </div>
        <div className="mt-8 flex w-fit items-center gap-3 border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
          <span className="h-2.5 w-2.5 bg-emerald-300" />
          Backend realtime milestone reached
        </div>
      </section>
    </main>
  );
}
