import { useSyncExternalStore } from "react";

const MAX_EVENTS = 100;
const MAX_SEEN_EVENT_IDS = 500;

let state = {
  events: [],
  subscriptions: []
};

const listeners = new Set();
const seenEventIds = new Set();
const seenEventIdQueue = [];

function emitChange() {
  for (const listener of listeners) {
    listener();
  }
}

function setState(nextState) {
  state = nextState;
  emitChange();
}

function rememberEventId(eventId) {
  if (!eventId) {
    return;
  }

  seenEventIds.add(eventId);
  seenEventIdQueue.push(eventId);

  while (seenEventIdQueue.length > MAX_SEEN_EVENT_IDS) {
    const expiredEventId = seenEventIdQueue.shift();
    seenEventIds.delete(expiredEventId);
  }
}

export const realtimeStore = {
  addEvent(event) {
    if (event.eventId && seenEventIds.has(event.eventId)) {
      return;
    }

    rememberEventId(event.eventId);

    setState({
      ...state,
      events: [
        {
          ...event,
          receivedAt: new Date().toISOString()
        },
        ...state.events
      ].slice(0, MAX_EVENTS)
    });
  },
  clearEvents() {
    seenEventIds.clear();
    seenEventIdQueue.length = 0;
    setState({
      ...state,
      events: []
    });
  },
  setSubscriptions(subscriptions) {
    setState({
      ...state,
      subscriptions: [...subscriptions].sort()
    });
  },
  getSnapshot() {
    return state;
  },
  subscribe(listener) {
    listeners.add(listener);

    return () => {
      listeners.delete(listener);
    };
  }
};

export function useRealtimeStore() {
  return useSyncExternalStore(
    realtimeStore.subscribe,
    realtimeStore.getSnapshot,
    realtimeStore.getSnapshot
  );
}
