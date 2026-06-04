const statusOptions = [
  { label: "All", value: "" },
  { label: "Pending", value: "pending" },
  { label: "Shipped", value: "shipped" },
  { label: "Delivered", value: "delivered" }
];

export default function OrdersToolbar({ search, status, onSearchChange, onStatusChange }) {
  return (
    <div className="flex flex-col gap-3 border-b border-zinc-200 px-5 py-4 dark:border-zinc-800 md:flex-row md:items-center md:justify-between">
      <div>
        <h2 className="text-base font-semibold text-zinc-950 dark:text-white">Orders</h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          REST data with realtime updates
        </p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <label className="min-w-0">
          <span className="sr-only">Search by customer name</span>
          <input
            className="h-10 w-full border border-zinc-300 bg-white px-3 text-sm text-zinc-950 outline-none transition focus:border-zinc-950 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white dark:focus:border-white sm:w-64"
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search customer"
            type="search"
            value={search}
          />
        </label>
        <label>
          <span className="sr-only">Filter by status</span>
          <select
            className="h-10 w-full border border-zinc-300 bg-white px-3 text-sm text-zinc-950 outline-none transition focus:border-zinc-950 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white dark:focus:border-white sm:w-40"
            onChange={(event) => onStatusChange(event.target.value)}
            value={status}
          >
            {statusOptions.map((option) => (
              <option key={option.value || "all"} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}
