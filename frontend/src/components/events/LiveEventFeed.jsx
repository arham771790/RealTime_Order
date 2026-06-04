import { useRealtimeStore } from "../../store/useRealtimeStore.js";
import { formatEventTime, formatOrderEvent } from "../../utils/events.js";

export default function LiveEventFeed() {
  const { events } = useRealtimeStore();

  return (
    <section className="border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-sm font-semibold text-zinc-950 dark:text-white">Live Event Feed</h2>
        <span className="text-xs font-medium text-zinc-400">{events.length}/100</span>
      </div>
      {events.length === 0 ? (
        <div className="mt-5 grid min-h-44 place-items-center text-sm text-zinc-500 dark:text-zinc-400">
          No events yet
        </div>
      ) : (
        <ol className="mt-5 max-h-80 space-y-3 overflow-y-auto pr-1">
          {events.map((event) => (
            <li
              className="border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-900"
              key={`${event.eventId}-${event.receivedAt}`}
            >
              <span className="font-medium text-zinc-500 dark:text-zinc-400">
                [{formatEventTime(event.receivedAt)}]
              </span>{" "}
              <span className="text-zinc-800 dark:text-zinc-100">{formatOrderEvent(event)}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
