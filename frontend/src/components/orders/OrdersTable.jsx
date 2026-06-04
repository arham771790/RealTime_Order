import { useDeferredValue, useState } from "react";

import StatusPill from "../atoms/StatusPill.jsx";
import { useOrders } from "../../hooks/useOrders.js";
import { formatDateTime } from "../../utils/date.js";
import OrdersToolbar from "./OrdersToolbar.jsx";

const tableHeaders = ["ID", "Customer Name", "Product Name", "Status", "Updated At"];

function getStatusTone(status) {
  return status === "pending" || status === "shipped" || status === "delivered"
    ? status
    : "neutral";
}

function OrdersTableBody({ orders, onOrderSelect }) {
  if (orders.length === 0) {
    return (
      <tr>
        <td className="px-5 py-12 text-center text-sm text-zinc-500 dark:text-zinc-400" colSpan={5}>
          No orders match the current filters
        </td>
      </tr>
    );
  }

  return orders.map((order) => (
    <tr
      className="cursor-pointer border-b border-zinc-100 transition hover:bg-zinc-50 last:border-0 dark:border-zinc-900 dark:hover:bg-zinc-900/70"
      key={order.id}
      onClick={() => onOrderSelect?.(order)}
    >
      <td className="whitespace-nowrap px-5 py-4 text-sm font-medium text-zinc-950 dark:text-white">
        #{order.id}
      </td>
      <td className="px-5 py-4 text-sm text-zinc-700 dark:text-zinc-300">{order.customerName}</td>
      <td className="px-5 py-4 text-sm text-zinc-700 dark:text-zinc-300">{order.productName}</td>
      <td className="px-5 py-4">
        <StatusPill label={order.status} tone={getStatusTone(order.status)} />
      </td>
      <td className="whitespace-nowrap px-5 py-4 text-sm text-zinc-500 dark:text-zinc-400">
        {formatDateTime(order.updatedAt)}
      </td>
    </tr>
  ));
}

export default function OrdersTable({ onOrderSelect }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const deferredSearch = useDeferredValue(search);
  const {
    data: orders = [],
    isLoading,
    isError,
    error
  } = useOrders({
    customerName: deferredSearch.trim(),
    status,
    limit: 100,
    offset: 0
  });

  return (
    <section className="border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <OrdersToolbar
        onSearchChange={setSearch}
        onStatusChange={setStatus}
        search={search}
        status={status}
      />
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800">
          <thead className="bg-zinc-50 dark:bg-zinc-900/70">
            <tr>
              {tableHeaders.map((header) => (
                <th
                  className="whitespace-nowrap px-5 py-3 text-left text-xs font-semibold uppercase text-zinc-500 dark:text-zinc-400"
                  key={header}
                  scope="col"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
            {isLoading ? (
              <tr>
                <td
                  className="px-5 py-12 text-center text-sm text-zinc-500 dark:text-zinc-400"
                  colSpan={5}
                >
                  Loading orders
                </td>
              </tr>
            ) : null}
            {isError ? (
              <tr>
                <td
                  className="px-5 py-12 text-center text-sm text-rose-600 dark:text-rose-300"
                  colSpan={5}
                >
                  {error?.message ?? "Unable to load orders"}
                </td>
              </tr>
            ) : null}
            {!isLoading && !isError ? (
              <OrdersTableBody onOrderSelect={onOrderSelect} orders={orders} />
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}
