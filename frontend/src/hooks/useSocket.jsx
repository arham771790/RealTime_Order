import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";

import { createSocket } from "../api/socketApi.js";

const SocketContext = createContext(null);

const initialState = {
  socket: null,
  socketId: null,
  status: "disconnected",
  latencyMs: null
};

export function SocketProvider({ children, socketFactory = createSocket }) {
  const [state, setState] = useState(initialState);
  const lastPingAtRef = useRef(null);

  useEffect(() => {
    const socket = socketFactory();
    let isEnginePacketListenerAttached = false;

    function setConnectionState(status, socketId = socket.id ?? null) {
      setState((currentState) => ({
        ...currentState,
        socket,
        socketId,
        status
      }));
    }

    function handleConnect() {
      attachEnginePacketListener();
      setConnectionState("connected", socket.id);
    }

    function handleDisconnect() {
      setConnectionState("disconnected", null);
    }

    function handleReconnectAttempt() {
      setConnectionState("reconnecting");
    }

    function handleConnectError() {
      setConnectionState("reconnecting");
    }

    function handleEnginePacket(packet) {
      if (packet.type === "ping") {
        lastPingAtRef.current = performance.now();
      }

      if (packet.type === "pong" && lastPingAtRef.current !== null) {
        const latencyMs = Math.max(0, Math.round(performance.now() - lastPingAtRef.current));
        lastPingAtRef.current = null;
        setState((currentState) => ({
          ...currentState,
          latencyMs
        }));
      }
    }

    function attachEnginePacketListener() {
      if (isEnginePacketListenerAttached || !socket.io.engine) {
        return;
      }

      socket.io.engine.on("packet", handleEnginePacket);
      isEnginePacketListenerAttached = true;
    }

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("connect_error", handleConnectError);
    socket.io.on("reconnect_attempt", handleReconnectAttempt);
    socket.connect();
    attachEnginePacketListener();

    setState((currentState) => ({
      ...currentState,
      socket,
      status: socket.connected ? "connected" : "reconnecting"
    }));

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("connect_error", handleConnectError);
      socket.io.off("reconnect_attempt", handleReconnectAttempt);
      if (isEnginePacketListenerAttached) {
        socket.io.engine?.off("packet", handleEnginePacket);
      }
      socket.disconnect();
      setState(initialState);
    };
  }, [socketFactory]);

  const value = useMemo(
    () => ({
      ...state,
      isConnected: state.status === "connected",
      isReconnecting: state.status === "reconnecting"
    }),
    [state]
  );

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

export function useSocket() {
  const context = useContext(SocketContext);

  if (!context) {
    throw new Error("useSocket must be used within SocketProvider.");
  }

  return context;
}
