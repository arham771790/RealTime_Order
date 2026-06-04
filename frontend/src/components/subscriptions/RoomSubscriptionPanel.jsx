import { useMemo, useState } from "react";

import { useSubscriptions } from "../../hooks/useSubscriptions.js";

const roomTypes = [
  { label: "Global", value: "admin" },
  { label: "Order", value: "order" },
  { label: "Customer", value: "customer" },
  { label: "Status", value: "status" }
];

const statuses = ["pending", "shipped", "delivered"];

function buildRoom(type, value) {
  if (type === "admin") {
    return "admin:global";
  }

  return `${type}:${value.trim()}`;
}

export default function RoomSubscriptionPanel() {
  const [roomType, setRoomType] = useState("admin");
  const [roomValue, setRoomValue] = useState("");
  const { subscriptions, error, isSubmitting, subscribe, unsubscribe } = useSubscriptions();
  const resolvedRoom = useMemo(() => buildRoom(roomType, roomValue), [roomType, roomValue]);
  const requiresValue = roomType !== "admin";
  const canSubscribe = !requiresValue || roomValue.trim().length > 0;

  function handleSubmit(event) {
    event.preventDefault();

    if (!canSubscribe) {
      return;
    }

    subscribe(resolvedRoom);
  }

  return (
    <section className="border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <div>
        <h2 className="text-sm font-semibold text-zinc-950 dark:text-white">Subscriptions</h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          {subscriptions.length} active
        </p>
      </div>
      <form className="mt-5 space-y-3" onSubmit={handleSubmit}>
        <label>
          <span className="sr-only">Room type</span>
          <select
            className="h-10 w-full border border-zinc-300 bg-white px-3 text-sm text-zinc-950 outline-none transition focus:border-zinc-950 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white dark:focus:border-white"
            onChange={(event) => {
              setRoomType(event.target.value);
              setRoomValue("");
            }}
            value={roomType}
          >
            {roomTypes.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        {roomType === "status" ? (
          <label>
            <span className="sr-only">Status room</span>
            <select
              className="h-10 w-full border border-zinc-300 bg-white px-3 text-sm text-zinc-950 outline-none transition focus:border-zinc-950 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white dark:focus:border-white"
              onChange={(event) => setRoomValue(event.target.value)}
              value={roomValue}
            >
              <option value="">Choose status</option>
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        {roomType === "order" || roomType === "customer" ? (
          <label>
            <span className="sr-only">{roomType === "order" ? "Order id" : "Customer name"}</span>
            <input
              className="h-10 w-full border border-zinc-300 bg-white px-3 text-sm text-zinc-950 outline-none transition focus:border-zinc-950 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white dark:focus:border-white"
              onChange={(event) => setRoomValue(event.target.value)}
              placeholder={roomType === "order" ? "Order ID" : "Customer name"}
              value={roomValue}
            />
          </label>
        ) : null}
        <button
          className="h-10 w-full bg-zinc-950 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-300 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 dark:disabled:bg-zinc-700 dark:disabled:text-zinc-400"
          disabled={!canSubscribe || isSubmitting}
          type="submit"
        >
          Subscribe
        </button>
      </form>
      {error ? <p className="mt-3 text-sm text-rose-600 dark:text-rose-300">{error}</p> : null}
      <div className="mt-5 space-y-2">
        {subscriptions.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">No active subscriptions</p>
        ) : (
          subscriptions.map((room) => (
            <div
              className="flex items-center justify-between gap-3 border border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900"
              key={room}
            >
              <span className="min-w-0 truncate text-sm text-zinc-700 dark:text-zinc-200">
                {room}
              </span>
              <button
                className="text-xs font-semibold text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white"
                onClick={() => unsubscribe(room)}
                type="button"
              >
                Remove
              </button>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
