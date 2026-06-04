import StatusPill from "../atoms/StatusPill.jsx";
import { useRealtimeStore } from "../../store/useRealtimeStore.js";
import { formatDateTime } from "../../utils/date.js";
import { getOrderSnapshotFromEvent, normalizeOrder } from "../../utils/orders.js";

function getStatusTone(status) {
  return status === "pending" || status === "shipped" || status === "delivered"
    ? status
    : "neutral";
}

export default function OrderDetailModal({ order, onClose }) {
  const { events } = useRealtimeStore();
  const normalizedOrder = normalizeOrder(order);
  const latestEvent = events.find((event) => String(event.orderId) === String(normalizedOrder.id));
  const liveOrder = latestEvent
    ? (getOrderSnapshotFromEvent(latestEvent) ?? normalizedOrder)
    : normalizedOrder;
  const isDeleted = latestEvent?.operation === "DELETE";

  return (
    <div
      aria-labelledby="order-detail-title"
      aria-modal="true"
      className="fixed inset-0 z-50 grid place-items-center bg-zinc-950/70 px-4 py-6"
      role="dialog"
    >
      <section className="w-full max-w-xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-950">
        <header className="flex items-start justify-between gap-4 border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
          <div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Order #{liveOrder.id}</p>
            <h2
              className="mt-1 text-xl font-semibold text-zinc-950 dark:text-white"
              id="order-detail-title"
            >
              {liveOrder.customerName}
            </h2>
          </div>
          <button
            className="border border-zinc-300 px-3 py-1.5 text-sm font-semibold text-zinc-700 hover:border-zinc-950 hover:text-zinc-950 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-white dark:hover:text-white"
            onClick={onClose}
            type="button"
          >
            Close
          </button>
        </header>
        <div className="space-y-5 px-5 py-5">
          {isDeleted ? (
            <div className="border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-700 dark:text-rose-300">
              This order was deleted in real time.
            </div>
          ) : null}
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-semibold uppercase text-zinc-500 dark:text-zinc-400">
                Product
              </dt>
              <dd className="mt-1 text-sm text-zinc-950 dark:text-white">
                {liveOrder.productName}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase text-zinc-500 dark:text-zinc-400">
                Status
              </dt>
              <dd className="mt-1">
                <StatusPill label={liveOrder.status} tone={getStatusTone(liveOrder.status)} />
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase text-zinc-500 dark:text-zinc-400">
                Customer
              </dt>
              <dd className="mt-1 text-sm text-zinc-950 dark:text-white">
                {liveOrder.customerName}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase text-zinc-500 dark:text-zinc-400">
                Last Updated
              </dt>
              <dd className="mt-1 text-sm text-zinc-950 dark:text-white">
                {formatDateTime(liveOrder.updatedAt)}
              </dd>
            </div>
          </dl>
        </div>
      </section>
    </div>
  );
}
