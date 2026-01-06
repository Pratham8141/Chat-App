import { useEffect, useState } from "react";
import api from "../../api/axios";
import { connectSocket } from "../../socket/socket";

type User = {
  id: string;
  email: string;
};

type Message = {
  content: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  messages: Message[];
};

const ForwardModal = ({ open, onClose, messages }: Props) => {
  const [users, setUsers] = useState<User[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!open) return;
    api.get("/chat/users").then((res) => setUsers(res.data));
  }, [open]);

  const toggleUser = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const forward = () => {
    const socket = connectSocket();

    selected.forEach((userId) => {
      messages.forEach((msg) => {
        socket.emit("private_message", {
          to: userId,
          content: msg.content,
        });
      });
    });

    onClose();
  };

  if (!open) return null;

  const hasSelection = selected.size > 0;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background:
          "radial-gradient(circle at top, rgba(15,23,42,0.90), rgba(15,23,42,0.96))",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
        backdropFilter: "blur(18px)",
        WebkitBackdropFilter: "blur(18px)",
      }}
    >
      <div
        style={{
          width: 360,
          maxHeight: "70vh",
          background:
            "linear-gradient(145deg, rgba(15,23,42,0.96), rgba(15,23,42,0.98))",
          padding: 18,
          borderRadius: 18,
          border: "1px solid rgba(148,163,184,0.55)",
          boxShadow:
            "0 26px 70px rgba(0,0,0,0.85), 0 0 0 1px rgba(15,23,42,0.9)",
          color: "#e5e7eb",
          display: "flex",
          flexDirection: "column",
          gap: 10,
          fontFamily:
            "system-ui, -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginBottom: 4,
          }}
        >
          <h3
            style={{
              margin: 0,
              fontSize: 16,
              fontWeight: 600,
            }}
          >
            Forward to
          </h3>

          <span
            style={{
              marginLeft: 8,
              fontSize: 11,
              padding: "3px 8px",
              borderRadius: 999,
              background:
                "linear-gradient(135deg, rgba(37,99,235,0.5), rgba(56,189,248,0.6))",
              color: "#ecfeff",
              textTransform: "uppercase",
              letterSpacing: 0.7,
            }}
          >
            {messages.length} message{messages.length !== 1 ? "s" : ""}
          </span>

          <button
            onClick={onClose}
            style={{
              marginLeft: "auto",
              border: "none",
              background: "transparent",
              color: "#9ca3af",
              cursor: "pointer",
              fontSize: 18,
              padding: 4,
            }}
          >
            ✕
          </button>
        </div>

        {/* Users list */}
        <div
          style={{
            borderRadius: 12,
            border: "1px solid rgba(51,65,85,0.9)",
            background:
              "linear-gradient(135deg, rgba(15,23,42,0.98), rgba(15,23,42,0.97))",
            padding: 4,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              maxHeight: "42vh",
              overflowY: "auto",
              paddingRight: 4,
              scrollbarWidth: "thin",
              scrollbarColor: "rgba(148,163,184,0.6) transparent",
            }}
          >
            {users.map((u) => {
              const isSelected = selected.has(u.id);

              return (
                <div
                  key={u.id}
                  onClick={() => toggleUser(u.id)}
                  style={{
                    padding: "8px 10px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    borderRadius: 8,
                    margin: "2px 2px",
                    background: isSelected
                      ? "linear-gradient(135deg, rgba(34,197,94,0.18), rgba(34,197,94,0.35))"
                      : "transparent",
                    border: isSelected
                      ? "1px solid rgba(74,222,128,0.8)"
                      : "1px solid transparent",
                    boxShadow: isSelected
                      ? "0 10px 24px rgba(22,163,74,0.55)"
                      : "none",
                    transition:
                      "background 120ms ease-out, transform 120ms ease-out, box-shadow 120ms ease-out, border-color 120ms ease-out",
                  }}
                >
                  {/* checkbox-like indicator */}
                  <div
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 6,
                      border: isSelected
                        ? "1px solid rgba(74,222,128,1)"
                        : "1px solid rgba(75,85,99,0.9)",
                      background: isSelected
                        ? "radial-gradient(circle at 30% 30%, #bbf7d0, #22c55e)"
                        : "rgba(15,23,42,1)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 12,
                      color: "#022c22",
                    }}
                  >
                    {isSelected ? "✓" : ""}
                  </div>

                  <span
                    style={{
                      fontSize: 14,
                      color: "#e5e7eb",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {u.email}
                  </span>
                </div>
              );
            })}

            {users.length === 0 && (
              <div
                style={{
                  padding: 10,
                  fontSize: 13,
                  color: "#9ca3af",
                  textAlign: "center",
                }}
              >
                No users available
              </div>
            )}
          </div>
        </div>

        {/* Footer actions */}
        <div
          style={{
            display: "flex",
            gap: 8,
            marginTop: 6,
          }}
        >
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: "8px 10px",
              borderRadius: 999,
              border: "1px solid rgba(75,85,99,0.9)",
              background:
                "linear-gradient(135deg, rgba(15,23,42,0.98), rgba(15,23,42,1))",
              color: "#e5e7eb",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            Cancel
          </button>

          <button
            onClick={forward}
            disabled={!hasSelection}
            style={{
              flex: 1,
              padding: "8px 10px",
              borderRadius: 999,
              border: "none",
              background: hasSelection
                ? "linear-gradient(135deg, #22c55e, #4ade80)"
                : "linear-gradient(135deg, #4b5563, #6b7280)",
              color: "#ecfdf5",
              cursor: hasSelection ? "pointer" : "not-allowed",
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: 0.6,
              textTransform: "uppercase",
              boxShadow: hasSelection
                ? "0 14px 34px rgba(22,163,74,0.7)"
                : "none",
              transition:
                "background 120ms ease-out, box-shadow 120ms ease-out, transform 120ms ease-out",
            }}
          >
            Forward
          </button>
        </div>
      </div>
    </div>
  );
};

export default ForwardModal;
