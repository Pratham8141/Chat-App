import { io, Socket } from "socket.io-client";
import { getToken } from "../auth/token";

let socket: Socket | null = null;

export const connectSocket = (): Socket => {
  if (!socket) {
    socket = io("http://localhost:5000", {
      auth: {
        token: getToken(),
      },
    });
  }
  return socket;
};

export const getSocket = (): Socket | null => {
  return socket;
};

export const disconnectSocket = () => {
  socket?.disconnect();
  socket = null;
};
