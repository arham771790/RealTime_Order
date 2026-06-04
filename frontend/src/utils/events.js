const operationLabels = {
  INSERT: "created",
  UPDATE: "updated",
  DELETE: "deleted"
};

export function formatEventTime(value) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).format(new Date(value));
}

export function formatOrderEvent(event) {
  const action = operationLabels[event.operation] ?? "changed";
  const orderId = event.orderId ?? event.new?.id ?? event.old?.id;

  return `Order #${orderId} ${action}`;
}
