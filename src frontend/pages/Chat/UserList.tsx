import { useEffect, useState } from "react";
import api from "../../api/axios";
import { connectSocket } from "../../socket/socket";

type User = {
  id: string;
  email: string;
  last_seen?: string;
};

type Props = {
  onSelect: (user: User) => void;
};

const UserList = ({ onSelect }: Props) => {
  const [users, setUsers] = useState<User[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

  // 🧠 Fetch users
  useEffect(() => {
    const fetchUsers = async () => {
      const res = await api.get("/chat/users");
      setUsers(res.data);
    };

    fetchUsers();
  }, []);

  // 🔌 Socket listeners
  useEffect(() => {
    const socket = connectSocket();

    // initial online users
    socket.on("online_users", (ids: string[]) => {
      setOnlineUsers(new Set(ids));
    });

    socket.on("user_online", ({ userId }: { userId: string }) => {
      setOnlineUsers((prev) => new Set(prev).add(userId));
    });

    socket.on("user_offline", ({ userId }: { userId: string }) => {
      setOnlineUsers((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    });

    // 🔴 unread badge update
    socket.on("unread_update", ({ from }: { from: string }) => {
      setUnreadCounts((prev) => ({
        ...prev,
        [from]: (prev[from] || 0) + 1,
      }));
    });

    return () => {
      socket.off("online_users");
      socket.off("user_online");
      socket.off("user_offline");
      socket.off("unread_update");
    };
  }, []);

  // 👆 User click
  const handleSelectUser = (user: User) => {
    onSelect(user);

    // clear unread
    setUnreadCounts((prev) => ({
      ...prev,
      [user.id]: 0,
    }));

    // notify backend
    const socket = connectSocket();
    socket.emit("message_seen", {
      senderId: user.id,
    });
  };

  // 🕒 Last seen formatter
  const formatLastSeen = (date?: string) => {
    if (!date) return "Offline";
    return `Last seen ${new Date(date).toLocaleString()}`;
  };

  return (
    <div
      style={{
        width: 320,
        borderRight: "1px solid rgba(51,65,85,0.9)",
        background:
          "linear-gradient(160deg, rgba(15,23,42,0.96), rgba(15,23,42,0.98))",
        color: "#e6eaf2",
        overflowY: "auto",
        fontFamily:
          "system-ui, -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif",
        boxShadow:
          "0 24px 60px rgba(0,0,0,0.9), 1px 0 0 rgba(15,23,42,0.9), 0 0 0 1px rgba(15,23,42,0.9)",
        backdropFilter: "blur(22px)",
        WebkitBackdropFilter: "blur(22px)",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "14px 16px 10px",
          borderBottom: "1px solid rgba(30,64,175,0.8)",
          background:
            "radial-gradient(circle at top left, rgba(30,64,175,0.45), transparent 52%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <h3
          style={{
            margin: 0,
            fontSize: 15,
            letterSpacing: 0.12,
            textTransform: "uppercase",
            color: "#e5e7eb",
          }}
        >
          Users
        </h3>
        <div
          style={{
            fontSize: 11,
            padding: "3px 9px",
            borderRadius: 999,
            background:
              "linear-gradient(135deg, rgba(30,64,175,0.5), rgba(56,189,248,0.6))",
            color: "#ecfeff",
            textTransform: "uppercase",
            letterSpacing: 1,
          }}
        >
          {users.length} chats
        </div>
      </div>

      {/* List */}
      {users.map((user) => {
        const isOnline = onlineUsers.has(user.id);
        const unread = unreadCounts[user.id] || 0;

        return (
          <div
            key={user.id}
            onClick={() => handleSelectUser(user)}
            style={{
              padding: "10px 14px",
              cursor: "pointer",
              borderBottom: "1px solid rgba(15,23,42,0.95)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background:
                "linear-gradient(90deg, rgba(15,23,42,0.96), rgba(15,23,42,0.98))",
              transition:
                "background 120ms ease-out, transform 120ms ease-out, box-shadow 120ms ease-out",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              {/* avatar circle */}
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: "50%",
                  background:
                    "radial-gradient(circle at 30% 20%, #38bdf8, #1d4ed8)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#e5e7eb",
                  fontSize: 14,
                  fontWeight: 600,
                  boxShadow: "0 10px 20px rgba(15,23,42,0.9)",
                  border: "1px solid rgba(129,140,248,0.7)",
                }}
              >
                {user.email[0]?.toUpperCase()}
              </div>

              <div>
                <div
                  style={{
                    fontWeight: 600,
                    fontSize: 14,
                    color: "#e5e7eb",
                    marginBottom: 2,
                  }}
                >
                  {user.email}
                </div>

                <div
                  style={{
                    fontSize: 11,
                    color: isOnline ? "#4ade80" : "#94a3b8",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "999px",
                      background: isOnline ? "#4ade80" : "#64748b",
                      boxShadow: isOnline
                        ? "0 0 0 6px rgba(74,222,128,0.18)"
                        : "none",
                    }}
                  />
                  {isOnline ? "Online" : formatLastSeen(user.last_seen)}
                </div>
              </div>
            </div>

            {unread > 0 && (
              <div
                style={{
                  minWidth: 26,
                  height: 26,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background:
                    "conic-gradient(from 160deg, #f97373, #fb923c, #f97373)",
                  color: "#fff7ed",
                  borderRadius: 999,
                  padding: "2px 8px",
                  fontSize: 11,
                  fontWeight: 700,
                  boxShadow:
                    "0 12px 30px rgba(248,113,113,0.7), 0 0 0 1px rgba(15,23,42,0.9)",
                }}
              >
                {unread}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default UserList;
