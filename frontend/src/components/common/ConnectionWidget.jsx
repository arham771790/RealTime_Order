import StatusPill from "../atoms/StatusPill.jsx";

export default function ConnectionWidget() {
  return (
    <section className="border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-zinc-950 dark:text-white">Websocket</h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Latency 0 ms</p>
        </div>
        <StatusPill label="Connected" tone="connected" />
      </div>
    </section>
  );
}
