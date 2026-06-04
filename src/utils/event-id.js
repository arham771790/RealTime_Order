import { randomUUID } from "node:crypto";

export function createEventId() {
  return randomUUID();
}

export function ensureEventId(event) {
  if (event.eventId) {
    return event;
  }

  return {
    ...event,
    eventId: createEventId()
  };
}

export default createEventId;
