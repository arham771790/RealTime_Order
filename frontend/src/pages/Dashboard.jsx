import { useState } from "react";

import ConnectionWidget from "../components/common/ConnectionWidget.jsx";
import SummaryCard from "../components/dashboard/SummaryCard.jsx";
import LiveEventFeed from "../components/events/LiveEventFeed.jsx";
import OrderDetailModal from "../components/orders/OrderDetailModal.jsx";
import OrdersTable from "../components/orders/OrdersTable.jsx";
import RoomSubscriptionPanel from "../components/subscriptions/RoomSubscriptionPanel.jsx";
import { useRealtimeEvents } from "../hooks/useRealtimeEvents.js";
import AppShell from "../layouts/AppShell.jsx";

const summaryCards = [
  {
    label: "Total Orders",
    value: "0",
    helper: "Waiting for API data",
    accentClassName: "bg-zinc-900 dark:bg-white"
  },
  {
    label: "Pending",
    value: "0",
    helper: "Awaiting shipment",
    accentClassName: "bg-amber-500"
  },
  {
    label: "Shipped",
    value: "0",
    helper: "In transit",
    accentClassName: "bg-sky-500"
  },
  {
    label: "Delivered",
    value: "0",
    helper: "Completed orders",
    accentClassName: "bg-teal-500"
  }
];

export default function Dashboard() {
  const [selectedOrder, setSelectedOrder] = useState(null);

  useRealtimeEvents();

  return (
    <AppShell>
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
