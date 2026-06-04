import httpClient from "./httpClient.js";

export async function getOrders(filters = {}) {
  const response = await httpClient.get("/api/orders", {
    params: {
      customerName: filters.customerName || undefined,
      status: filters.status || undefined,
      limit: filters.limit,
      offset: filters.offset
    }
  });

  return response.data.data;
}
