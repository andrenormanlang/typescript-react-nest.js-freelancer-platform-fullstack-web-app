// src/contexts/SocketContext.tsx

import React, { createContext, useEffect, useState, ReactNode } from "react";
import type { Socket } from "socket.io-client";
import { useUserContext } from "../hooks/useUserContext"; // Import the custom hook

interface SocketContextProps {
  socket: Socket | null;
}

export const SocketContext = createContext<SocketContextProps>({
  socket: null,
});

export const SocketProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const backendUrl = import.meta.env.VITE_BASE_URL_CHAT_EMPLOYER; // Adjust as needed
  const { user } = useUserContext(); // Use the custom hook to get user

  useEffect(() => {
    let isActive = true;
    let newSocket: Socket | null = null;

    const connect = async () => {
      const token = localStorage.getItem("token");
      if (!token || !backendUrl) {
        setSocket(null);
        return;
      }

      const { io } = await import("socket.io-client");
      if (!isActive) return;

      newSocket = io(backendUrl, {
        auth: { token },
      });
      setSocket(newSocket);

      newSocket.on("connect", () => {
        console.log("Socket connected");
      });

      newSocket.on("disconnect", () => {
        console.log("Socket disconnected");
      });

      newSocket.on("connect_error", (err) => {
        console.error("Socket connection error:", err);
      });
    };

    connect();

    return () => {
      isActive = false;
      if (newSocket) {
        newSocket.disconnect();
      }
    };
  }, [backendUrl, user]);

  return (
    <SocketContext.Provider value={{ socket }}>
      {children}
    </SocketContext.Provider>
  );
};
