import { useEffect } from "react";

import { realtimeStore } from "../store/useRealtimeStore.js";
import { useSocket } from "./useSocket.jsx";

export function useRealtimeEvents() {
  const { socket } = useSocket();

  useEffect(() => {
    if (!socket) {
      return undefined;
    }

    function handleOrderEvent(event) {
      realtimeStore.addEvent(event);
    }

    socket.on("order:event", handleOrderEvent);

    return () => {
      socket.off("order:event", handleOrderEvent);
    };
  }, [socket]);
}
