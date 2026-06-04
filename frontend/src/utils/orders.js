export function normalizeOrder(order) {
  if (!order) {
    return null;
  }

  return {
    id: order.id,
    customerName: order.customerName ?? order.customer_name,
    productName: order.productName ?? order.product_name,
    status: order.status,
    updatedAt: order.updatedAt ?? order.updated_at
  };
}

export function getOrderSnapshotFromEvent(event) {
  return normalizeOrder(event.new ?? event.old);
}

export function getOrderIdFromEvent(event) {
  return event.orderId ?? event.new?.id ?? event.old?.id;
}

export function applyRealtimeEventsToOrders(orders, events) {
  const orderMap = new Map();

  for (const order of orders) {
    const normalizedOrder = normalizeOrder(order);

    if (normalizedOrder) {
      orderMap.set(normalizedOrder.id, normalizedOrder);
    }
  }

  for (const event of [...events].reverse()) {
    const orderId = getOrderIdFromEvent(event);

    if (!orderId) {
      continue;
    }

    if (event.operation === "DELETE") {
      orderMap.delete(orderId);
      continue;
    }

    const orderSnapshot = normalizeOrder(event.new);

    if (orderSnapshot) {
      orderMap.set(orderId, orderSnapshot);
    }
  }

  return [...orderMap.values()].sort((leftOrder, rightOrder) => {
    const rightUpdatedAt = new Date(rightOrder.updatedAt).getTime();
    const leftUpdatedAt = new Date(leftOrder.updatedAt).getTime();

    if (rightUpdatedAt !== leftUpdatedAt) {
      return rightUpdatedAt - leftUpdatedAt;
    }

    return rightOrder.id - leftOrder.id;
  });
}

export function getRecentlyChangedOrderIds(events, now = Date.now(), windowMs = 8000) {
  const changedOrderIds = new Set();

  for (const event of events) {
    const receivedAt = new Date(event.receivedAt ?? event.occurredAt).getTime();

    if (!Number.isFinite(receivedAt) || now - receivedAt > windowMs) {
      continue;
    }

    const orderId = getOrderIdFromEvent(event);

    if (orderId && event.operation !== "DELETE") {
      changedOrderIds.add(orderId);
    }
  }

  return changedOrderIds;
}
