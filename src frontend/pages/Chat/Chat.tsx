import { useState } from "react";
import { useNavigate } from "react-router-dom";
import UserList from "./UserList";
import ChatWindow from "./ChatWindow";
import { clearToken } from "../../auth/token";
import { disconnectSocket } from "../../socket/socket";
import { getToken } from "../../auth/token";

type User = {
  id: string;
  email: string;
};

const Chat = () => {
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await fetch("http://localhost:5000/api/chat/last-seen", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${getToken()}`,
      },
    });

    disconnectSocket();
    clearToken();
    navigate("/login");
  };

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        width: "100vw",
        background:
          "radial-gradient(circle at top, #020617 0, #020617 35%, #020617 100%)",
        overflow: "hidden",
        fontFamily:
          "system-ui, -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif",
        color: "#e5e7eb",
      }}
    >
      {/* LEFT PANEL */}
      <div
        style={{
          width: 320,
          minWidth: 320,
          background:
            "linear-gradient(160deg, rgba(15,23,42,0.98), rgba(15,23,42,0.98))",
          borderRight: "1px solid rgba(30,64,175,0.75)",
          boxShadow: "8px 0 32px rgba(15,23,42,0.95)",
          zIndex: 10,
        }}
      >
        <UserList onSelect={setSelectedUser} />
      </div>

      {/* RIGHT PANEL */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          background:
            "radial-gradient(circle at top right, rgba(30,64,175,0.40), transparent 55%)",
          position: "relative",
          padding: "14px 18px 18px",
        }}
      >
        {selectedUser ? (
          <>
            {/* HEADER */}
            <div
              style={{
                padding: "10px 16px",
                borderRadius: 16,
                border: "1px solid rgba(30,64,175,0.75)",
                background:
                  "linear-gradient(135deg, rgba(15,23,42,0.96), rgba(15,23,42,0.98))",
                color: "#e5e7eb",
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 14,
                boxShadow:
                  "0 20px 48px rgba(15,23,42,0.95), 0 0 0 1px rgba(15,23,42,0.9)",
                backdropFilter: "blur(22px)",
                WebkitBackdropFilter: "blur(22px)",
              }}
            >
              {/* avatar badge */}
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background:
                    "radial-gradient(circle at 30% 20%, #38bdf8, #4f46e5)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 14,
                  fontWeight: 600,
                  color: "#ecfeff",
                  boxShadow: "0 12px 26px rgba(15,23,42,0.9)",
                  border: "1px solid rgba(129,140,248,0.75)",
                }}
              >
                {selectedUser.email[0]?.toUpperCase()}
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 2,
                }}
              >
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                  }}
                >
                  Chat with {selectedUser.email}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    color: "#94a3b8",
                  }}
                >
                  Direct messages · Secure session
                </span>
              </div>

              <button
                onClick={handleLogout}
                style={{
                  marginLeft: "auto",
                  padding: "7px 14px",
                  background:
                    "linear-gradient(135deg, #ef4444, #f97316, #f97373)",
                  backgroundSize: "180% 180%",
                  border: "none",
                  borderRadius: 999,
                  color: "#fef2f2",
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 600,
                  letterSpacing: 0.8,
                  textTransform: "uppercase",
                  boxShadow:
                    "0 14px 34px rgba(248,113,113,0.7), 0 0 0 1px rgba(15,23,42,0.9)",
                  transition:
                    "transform 120ms ease-out, box-shadow 120ms ease-out, background-position 220ms ease-out, filter 120ms ease-out",
                }}
              >
                Logout
              </button>
            </div>

            {/* CHAT BODY */}
            <div
              style={{
                flex: 1,
                minHeight: 0,
                display: "flex",
                justifyContent: "center",
                alignItems: "stretch",
                background:
                  "radial-gradient(circle at top, rgba(15,23,42,0.98), rgba(15,23,42,1))",
                borderRadius: 24,
                border: "1px solid rgba(15,23,42,0.95)",
                boxShadow:
                  "0 32px 80px rgba(15,23,42,0.98), 0 0 0 1px rgba(15,23,42,0.98)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: "100%",
                  maxWidth: 900, // 🔥 KEY LINE (kept from original)
                  display: "flex",
                  flexDirection: "column",
                  background:
                    "linear-gradient(140deg, rgba(15,23,42,0.98), rgba(15,23,42,0.99))",
                }}
              >
                <ChatWindow userId={selectedUser.id} />
              </div>
            </div>
          </>
        ) : (
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#9ca3af",
              fontSize: 14,
              borderRadius: 24,
              border: "1px dashed rgba(51,65,85,0.9)",
              background:
                "linear-gradient(135deg, rgba(15,23,42,0.96), rgba(15,23,42,0.98))",
              boxShadow: "0 24px 64px rgba(15,23,42,0.95)",
            }}
          >
            Select a user to start chatting
          </div>
        )}
      </div>
    </div>
  );
};

export default Chat;
