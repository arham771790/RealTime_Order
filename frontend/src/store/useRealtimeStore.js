import { useSyncExternalStore } from "react";

const MAX_EVENTS = 100;

let state = {
  events: []
};

const listeners = new Set();

function emitChange() {
  for (const listener of listeners) {
    listener();
  }
}

function setState(nextState) {
  state = nextState;
  emitChange();
}

export const realtimeStore = {
  addEvent(event) {
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
    setState({
      ...state,
      events: []
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
