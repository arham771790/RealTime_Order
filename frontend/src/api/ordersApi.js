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

export async function createOrder(order) {
  const response = await httpClient.post("/api/orders", order);

  return response.data.data;
}

export async function updateOrderStatus(id, status) {
  const response = await httpClient.patch(`/api/orders/${id}/status`, { status });

  return response.data.data;
}

export async function deleteOrder(id) {
  await httpClient.delete(`/api/orders/${id}`);
}
