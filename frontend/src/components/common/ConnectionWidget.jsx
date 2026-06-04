import StatusPill from "../atoms/StatusPill.jsx";
import { useSocket } from "../../hooks/useSocket.jsx";

const statusLabels = {
  connected: "Connected",
  reconnecting: "Reconnecting",
  disconnected: "Disconnected"
};

const statusTones = {
  connected: "connected",
  reconnecting: "pending",
  disconnected: "neutral"
};

export default function ConnectionWidget() {
  const { status, latencyMs, socketId } = useSocket();

  return (
    <section className="border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-zinc-950 dark:text-white">Websocket</h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {latencyMs === null ? "Latency pending" : `Latency ${latencyMs} ms`}
          </p>
          {socketId ? (
            <p className="mt-1 max-w-48 truncate text-xs text-zinc-400 dark:text-zinc-500">
              {socketId}
            </p>
          ) : null}
        </div>
        <StatusPill label={statusLabels[status]} tone={statusTones[status]} />
      </div>
    </section>
  );
}
