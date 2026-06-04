import { useState } from "react";

import ConnectionWidget from "../components/common/ConnectionWidget.jsx";
import SummaryCard from "../components/dashboard/SummaryCard.jsx";
import LiveEventFeed from "../components/events/LiveEventFeed.jsx";
import OrderDetailModal from "../components/orders/OrderDetailModal.jsx";
import OrdersTable from "../components/orders/OrdersTable.jsx";
import RoomSubscriptionPanel from "../components/subscriptions/RoomSubscriptionPanel.jsx";
import { useOrders } from "../hooks/useOrders.js";
import { useRealtimeEvents } from "../hooks/useRealtimeEvents.js";
import AppShell from "../layouts/AppShell.jsx";
import { useRealtimeStore } from "../store/useRealtimeStore.js";
import { applyRealtimeEventsToOrders } from "../utils/orders.js";

function buildSummaryCards(orders, { isError, isLoading }) {
  const counts = orders.reduce(
    (summary, order) => ({
      ...summary,
      [order.status]: (summary[order.status] ?? 0) + 1,
      total: summary.total + 1
    }),
    { delivered: 0, pending: 0, shipped: 0, total: 0 }
  );
  const helper = isError ? "API unavailable" : "Updated from REST and realtime events";

  return [
    {
      label: "Total Orders",
      value: counts.total,
      helper,
      isLoading,
      accentClassName: "bg-zinc-900 dark:bg-white"
    },
    {
      label: "Pending",
      value: counts.pending,
      helper: isError ? helper : "Awaiting shipment",
      isLoading,
      accentClassName: "bg-amber-500"
    },
    {
      label: "Shipped",
      value: counts.shipped,
      helper: isError ? helper : "In transit",
      isLoading,
      accentClassName: "bg-sky-500"
    },
    {
      label: "Delivered",
      value: counts.delivered,
      helper: isError ? helper : "Completed orders",
      isLoading,
      accentClassName: "bg-teal-500"
    }
  ];
}

export default function Dashboard({ activePage, onNavigate }) {
  const [selectedOrder, setSelectedOrder] = useState(null);
  const { events } = useRealtimeStore();
  const {
    data: orders = [],
    isError,
    isLoading
  } = useOrders({
    customerName: "",
    status: "",
    limit: 100,
    offset: 0
  });
  const realtimeOrders = applyRealtimeEventsToOrders(orders, events);
  const summaryCards = buildSummaryCards(realtimeOrders, { isError, isLoading });

  useRealtimeEvents();

  return (
    <AppShell activePage={activePage} onNavigate={onNavigate}>
      <div className="px-5 py-6 sm:px-8">
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map((card) => (
            <SummaryCard key={card.label} {...card} />
          ))}
        </section>
        <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <OrdersTable onOrderSelect={setSelectedOrder} />
          <aside className="space-y-6">
            <ConnectionWidget />
            <LiveEventFeed />
            <RoomSubscriptionPanel />
          </aside>
        </section>
      </div>
      {selectedOrder ? (
        <OrderDetailModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />
      ) : null}
    </AppShell>
  );
}
