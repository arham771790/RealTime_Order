import ConnectionWidget from "../components/common/ConnectionWidget.jsx";
import SummaryCard from "../components/dashboard/SummaryCard.jsx";
import OrdersTable from "../components/orders/OrdersTable.jsx";
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
  return (
    <AppShell>
      <div className="px-5 py-6 sm:px-8">
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map((card) => (
            <SummaryCard key={card.label} {...card} />
          ))}
        </section>
        <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <OrdersTable />
          <aside className="space-y-6">
            <ConnectionWidget />
            <section className="border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
              <h2 className="text-sm font-semibold text-zinc-950 dark:text-white">
                Live Event Feed
              </h2>
              <div className="mt-5 grid min-h-44 place-items-center text-sm text-zinc-500 dark:text-zinc-400">
                No events yet
              </div>
            </section>
            <section className="border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
              <h2 className="text-sm font-semibold text-zinc-950 dark:text-white">Subscriptions</h2>
              <div className="mt-5 grid min-h-32 place-items-center text-sm text-zinc-500 dark:text-zinc-400">
                admin:global
              </div>
            </section>
          </aside>
        </section>
      </div>
    </AppShell>
  );
}
