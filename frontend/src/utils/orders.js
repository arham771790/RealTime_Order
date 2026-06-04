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
