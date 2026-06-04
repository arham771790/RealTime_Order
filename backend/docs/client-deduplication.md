# Client Side Deduplication

Realtime order events are delivered with an `eventId` UUID. PostgreSQL trigger events generate this id with `gen_random_uuid()`, outbox events use the UUID primary key from `outbox_events`, and Redis publishing fills a UUID if a future producer omits one.

Browser clients should keep a bounded set of recently seen event ids. If a websocket reconnect, Redis replay, or parallel delivery path sends the same event twice, the client drops the duplicate before updating local UI state.

```js
const MAX_SEEN_EVENT_IDS = 500;
const seenEventIds = new Set();
const seenEventIdQueue = [];

function shouldApplyEvent(event) {
  if (!event.eventId) {
    return true;
  }

  if (seenEventIds.has(event.eventId)) {
    return false;
  }

  seenEventIds.add(event.eventId);
  seenEventIdQueue.push(event.eventId);

  while (seenEventIdQueue.length > MAX_SEEN_EVENT_IDS) {
    seenEventIds.delete(seenEventIdQueue.shift());
  }

  return true;
}
```

The demo React store implements this strategy in `frontend/src/store/useRealtimeStore.js` and keeps only the latest 100 visible events.
