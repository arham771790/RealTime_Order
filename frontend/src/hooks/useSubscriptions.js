import { useEffect, useState } from "react";

import { realtimeStore, useRealtimeStore } from "../store/useRealtimeStore.js";
import { useSocket } from "./useSocket.jsx";

export function useSubscriptions() {
  const { socket, isConnected } = useSocket();
  const { subscriptions } = useRealtimeStore();
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!socket) {
      return undefined;
    }

    function handleSubscriptionUpdate(payload) {
      realtimeStore.setSubscriptions(payload.rooms ?? []);
    }

    socket.on("subscription:updated", handleSubscriptionUpdate);

    return () => {
      socket.off("subscription:updated", handleSubscriptionUpdate);
    };
  }, [socket]);

  function sendSubscriptionEvent(eventName, room) {
    if (!socket || !isConnected) {
      setError("Socket is not connected.");
      return;
    }

    setError(null);
    setIsSubmitting(true);
    socket.emit(eventName, { room }, (acknowledgement) => {
      setIsSubmitting(false);

      if (!acknowledgement?.ok) {
        setError(acknowledgement?.error ?? "Subscription request failed.");
        return;
      }

      realtimeStore.setSubscriptions(acknowledgement.rooms ?? []);
    });
  }

  return {
    subscriptions,
    error,
    isSubmitting,
    subscribe: (room) => sendSubscriptionEvent("subscribe", room),
    unsubscribe: (room) => sendSubscriptionEvent("unsubscribe", room)
  };
}
