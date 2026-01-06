// src/websocket/presence.ts

const onlineUsers = new Map<string, string>();
// userId -> socketId

export const setOnline = (userId: string, socketId: string) => {
  onlineUsers.set(userId, socketId);
};

export const setOffline = (userId: string) => {
  onlineUsers.delete(userId);
};

export const getSocketId = (userId: string) => {
  return onlineUsers.get(userId);
};

export const getOnlineUsers = () => {
  return onlineUsers;
};
