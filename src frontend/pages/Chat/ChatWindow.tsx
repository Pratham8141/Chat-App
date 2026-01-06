import { useEffect, useRef, useState } from "react";
import { connectSocket } from "../../socket/socket";
import { getToken } from "../../auth/token";
import { jwtDecode } from "jwt-decode";
import ForwardModal from "./ForwardModal"; // ADD THIS IMPORT


type Props = {
  userId: string;
};


type Reaction = {
  emoji: string;
  count: number;
  reactedByMe?: boolean;
};


/* ============================
   🔁 REPLY MESSAGE SHAPE
============================ */
type ReplyMessage = {
  id: string;
  sender_id: string;
  content: string;
};


type Message = {
  id?: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at?: string;
  status?: "sent" | "delivered" | "seen";
  reactions?: Reaction[];

  is_forwarded?: boolean;
  original_sender_id?: string;

  /* 🔁 REPLY (LEGACY / FALLBACK) */
  reply_to?: string | null;
  reply_to_content?: string | null;

  /* 🔁 REPLY (BACKEND ACTUAL SHAPE) */
  reply_message?: ReplyMessage | null;
};


type JwtPayload = {
  id: string;
};


const ChatWindow = ({ userId }: Props) => {
  if (!userId) {
    return (
      <div
        style={{
          padding: 20,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          background:
            "radial-gradient(circle at top, #1e293b 0, #020617 45%, #000 100%)",
          color: "#6b7280",
          fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif",
          letterSpacing: 0.2,
        }}
      >
        Select a user to start a conversation
      </div>
    );
  }

  const token = getToken();
  const currentUserId = token ? jwtDecode<JwtPayload>(token).id : null;

  const [messages, setMessages] = useState<Message[]>([]);
  const [message, setMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const [activeMessageId, setActiveMessageId] = useState<string | null>(null);

  /* 🔁 REPLY STATE */
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);

  /* 🆕 FORWARD MODAL STATE */
  const [forwardModalOpen, setForwardModalOpen] = useState(false);
  const [messagesToForward, setMessagesToForward] = useState<Message[]>([]);

  const socketRef = useRef<any>(null);
  const typingTimeout = useRef<number | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  
  /* 🆕 FULL DUPLICATION PREVENTION (PERSISTENT) */
  const pendingMessageIds = useRef<Set<string>>(new Set());
  const historyMessageIds = useRef<Set<string>>(new Set());

  /* ============================
     SOCKET INIT
  ============================ */
  useEffect(() => {
    socketRef.current = connectSocket();
  }, []);

  /* ============================
     RESTORE HISTORY IDS ON REFRESH
  ============================ */
  useEffect(() => {
    // 🆕 Restore history message IDs from localStorage
    const savedHistoryIds = localStorage.getItem(`chat_history_${userId}`);
    if (savedHistoryIds) {
      try {
        const ids = JSON.parse(savedHistoryIds) as string[];
        ids.forEach(id => historyMessageIds.current.add(id));
      } catch {
        // Ignore invalid data
      }
    }
  }, [userId]);

  /* ============================
     AUTO SCROLL
  ============================ */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  /* ============================
     FETCH HISTORY (PERSISTENT TRACKING)
  ============================ */
  const fetchHistory = async (cursor?: string) => {
    if (!token || loadingMore || !hasMore) return;

    setLoadingMore(true);

    const url = new URL(`http://localhost:5000/api/messages/${userId}`);
    url.searchParams.set("limit", "20");
    if (cursor) url.searchParams.set("cursor", cursor);

    try {
      const res = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (!Array.isArray(data) || data.length === 0) {
        setHasMore(false);
      } else {
        setMessages((prev) => {
          const updatedMessages = [...data, ...prev];
          
          // 🆕 Track AND persist history message IDs across refresh
          data.forEach((msg: Message) => {
            if (msg.id) {
              historyMessageIds.current.add(msg.id);
            }
          });
          
          // 🆕 Persist to localStorage for page refresh protection
          localStorage.setItem(`chat_history_${userId}`, JSON.stringify(Array.from(historyMessageIds.current)));
          
          return updatedMessages;
        });
      }
    } catch {
      setHasMore(false);
    }

    setLoadingMore(false);
  };

  /* ============================
     RESET ON USER CHANGE (FULL CLEANUP)
  ============================ */
  useEffect(() => {
    setMessages([]);
    setHasMore(true);
    
    // 🆕 Full cleanup including localStorage
    historyMessageIds.current.clear();
    localStorage.removeItem(`chat_history_${userId}`);
    pendingMessageIds.current.clear();
    
    fetchHistory();
    setIsTyping(false);
    setReplyingTo(null);

    socketRef.current?.emit("message_seen", {
      senderId: userId,
    });
  }, [userId]);

  /* ============================
     INCOMING MESSAGES (TRIPLE PROTECTION)
  ============================ */
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    const handleMessage = (msg: Message) => {
      if (msg.sender_id === userId || msg.receiver_id === userId) {
        // 🆕 TRIPLE-LAYER PROTECTION:
        
        // 1️⃣ Block pending/outgoing messages
        if (msg.id && pendingMessageIds.current.has(msg.id)) {
          pendingMessageIds.current.delete(msg.id);
          return;
        }
        
        // 2️⃣ Block history messages (including restored from storage)
        if (msg.id && historyMessageIds.current.has(msg.id)) {
          return;
        }
        
        setMessages((prev) => {
          // 3️⃣ Content/timestamp backup protection
          const exists = prev.some((m) => {
            if (m.id === msg.id) return true;
            
            if (m.content === msg.content) {
              const timeDiff = Math.abs(
                (m.created_at ? new Date(m.created_at).getTime() : 0) - 
                (msg.created_at ? new Date(msg.created_at).getTime() : 0)
              );
              return timeDiff < 1000;
            }
            return false;
          });
          
          if (exists) return prev;
          return [...prev, msg];
        });
      }
    };

    socket.on("private_message", handleMessage);
    return () => socket.off("private_message", handleMessage);
  }, [userId]);

  /* ============================
     SEND MESSAGE (TEMP ID TRACKING)
  ============================ */
  const sendMessage = () => {
    if (!message.trim() || !currentUserId) return;

    const tempMessageId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    pendingMessageIds.current.add(tempMessageId);

    socketRef.current?.emit("private_message", {
      to: userId,
      content: message,
      replyTo: replyingTo?.id || null,
      tempId: tempMessageId,
    });

    setMessage("");
    setReplyingTo(null);

    socketRef.current?.emit("stop_typing", {
      receiverId: userId,
    });
  };

  /* ============================
     READ RECEIPTS
  ============================ */
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !currentUserId) return;

    const handleSeen = ({ by }: { by: string }) => {
      if (by !== userId) return;

      setMessages((prev) =>
        prev.map((m) =>
          m.sender_id === currentUserId ? { ...m, status: "seen" } : m
        )
      );
    };

    socket.on("messages_seen", handleSeen);
    return () => socket.off("messages_seen", handleSeen);
  }, [userId, currentUserId]);

  /* ============================
     ❤️ REACTION UPDATES
  ============================ */
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    const handleReactionUpdate = ({
      messageId,
      reactions,
    }: {
      messageId: string;
      reactions: Reaction[];
    }) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, reactions } : m))
      );
    };

    socket.on("reaction_update", handleReactionUpdate);
    return () => socket.off("reaction_update", handleReactionUpdate);
  }, []);

  /* ============================
     🆕 FORWARD MODAL HANDLER (UPDATED)
  ============================ */
  const forwardMessage = (msg: Message) => {
    // 🆕 Open the ForwardModal instead of prompt
    setMessagesToForward([msg]);
    setForwardModalOpen(true);
  };

  /* ============================
     🆕 FORWARD MULTIPLE MESSAGES
  ============================ */
  const forwardMultipleMessages = (selectedMessages: Message[]) => {
    setMessagesToForward(selectedMessages);
    setForwardModalOpen(true);
  };

  /* ============================
     🗑️ DELETE MESSAGE LISTENER
  ============================ */
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    const handleDeleted = ({ messageId }: { messageId: string }) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? {
                ...m,
                content: "This message was deleted",
                reactions: [],
              }
            : m
        )
      );
    };

    socket.on("message_deleted", handleDeleted);
    return () => socket.off("message_deleted", handleDeleted);
  }, []);

  /* ============================
     TYPING
  ============================ */
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    socket.on("typing", ({ userId: typingUser }: any) => {
      if (typingUser === userId) setIsTyping(true);
    });

    socket.on("stop_typing", ({ userId: typingUser }: any) => {
      if (typingUser === userId) setIsTyping(false);
    });

    return () => {
      socket.off("typing");
      socket.off("stop_typing");
    };
  }, [userId]);

  /* ============================
     INPUT
  ============================ */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(e.target.value);

    socketRef.current?.emit("typing", { receiverId: userId });

    if (typingTimeout.current) clearTimeout(typingTimeout.current);

    typingTimeout.current = window.setTimeout(() => {
      socketRef.current?.emit("stop_typing", {
        receiverId: userId,
      });
    }, 800);
  };

  /* ============================
     ❤️ REACT
  ============================ */
  const reactToMessage = (messageId: string, emoji: string) => {
    socketRef.current?.emit("reaction", {
      messageId,
      emoji,
    });
  };

  const formatTime = (date?: string) => {
    if (!date) return "";
    return new Date(date).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    const handleRemoved = ({ messageId }: { messageId: string }) => {
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    };

    socket.on("message_removed", handleRemoved);
    return () => socket.off("message_removed", handleRemoved);
  }, []);

  /* ============================
     CLOSE FORWARD MODAL
  ============================ */
  const handleCloseForwardModal = () => {
    setForwardModalOpen(false);
    setMessagesToForward([]);
  };

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background:
          "radial-gradient(circle at top, #1f2937 0, #020617 40%, #020617 100%)",
        color: "#e5e7eb",
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif",
        boxShadow:
          "0 24px 60px rgba(0,0,0,0.85), 0 0 0 1px rgba(148,163,184,0.08)",
        borderRadius: 24,
        border: "1px solid rgba(148,163,184,0.18)",
        overflow: "hidden",
        backdropFilter: "blur(26px)",
      }}
    >
      {/* 🆕 FORWARD MODAL - RENDERED HERE */}
      <ForwardModal
        open={forwardModalOpen}
        onClose={handleCloseForwardModal}
        messages={messagesToForward.map(msg => ({ content: msg.content }))}
      />

      {/* Top area (scrollable) */}
      <div
        ref={scrollRef}
        onScroll={(e) => {
          const el = e.currentTarget;
          if (el.scrollTop === 0 && hasMore && !loadingMore) {
            const oldest = messages[0]?.created_at;
            if (oldest) fetchHistory(oldest);
          }
        }}
        style={{
          flex: 1,
          padding: "16px 18px 12px",
          overflowY: "auto",
          minHeight: 0,
          scrollbarWidth: "thin",
          scrollbarColor: "rgba(148,163,184,0.5) transparent",
        }}
      >
        {loadingMore && (
          <div
            style={{
              fontSize: 11,
              textAlign: "center",
              marginBottom: 12,
              color: "#64748b",
              textTransform: "uppercase",
              letterSpacing: 1.2,
            }}
          >
            Loading previous messages…
          </div>
        )}

        {messages.map((msg, idx) => {
          const isMe = msg.sender_id === currentUserId;

          return (
            <div
              key={msg.id || idx}
              onClick={() =>
                setActiveMessageId(
                  activeMessageId === msg.id ? null : msg.id || null
                )
              }
              style={{
                display: "flex",
                justifyContent: isMe ? "flex-end" : "flex-start",
                padding: "6px 6px",
                marginBottom: 4,
                cursor: "pointer",
              }}
            >
              <div
                style={{
                  position: "relative",
                  background: isMe
                    ? "linear-gradient(135deg, rgba(96,165,250,0.18), rgba(56,189,248,0.32))"
                    : "linear-gradient(135deg, rgba(15,23,42,0.92), rgba(15,23,42,0.86))",
                  color: isMe ? "#ecfeff" : "#e5e7eb",
                  padding: "10px 12px",
                  borderRadius: 18,
                  maxWidth: "64%",
                  boxShadow: isMe
                    ? "0 10px 28px rgba(37,99,235,0.45)"
                    : "0 10px 26px rgba(15,23,42,0.85)",
                  border: isMe
                    ? "1px solid rgba(129,140,248,0.6)"
                    : "1px solid rgba(30,64,175,0.6)",
                  backdropFilter: "blur(18px)",
                  WebkitBackdropFilter: "blur(18px)",
                  transition:
                    "transform 140ms ease-out, box-shadow 140ms ease-out, background 140ms ease-out",
                }}
              >
                {/* reply preview */}
                {(msg.reply_message || msg.reply_to_content) && (
                  <div
                    style={{
                      background: "linear-gradient(135deg, #020617, #020617)",
                      padding: "6px 8px",
                      borderRadius: 10,
                      fontSize: 12,
                      marginBottom: 6,
                      opacity: 0.9,
                      border: "1px solid rgba(148,163,184,0.35)",
                      boxShadow: "inset 0 0 0 1px rgba(15,23,42,0.9)",
                      whiteSpace: "nowrap",
                      textOverflow: "ellipsis",
                      overflow: "hidden",
                      maxWidth: "100%",
                    }}
                  >
                    {msg.reply_message?.content || msg.reply_to_content}
                  </div>
                )}

                <div style={{ fontSize: 14, lineHeight: 1.5 }}>
                  {msg.content}
                </div>

                <div
                  style={{
                    fontSize: 10,
                    opacity: 0.75,
                    marginTop: 6,
                    display: "flex",
                    justifyContent: "flex-end",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <span>{formatTime(msg.created_at)}</span>
                  {isMe && (
                    <span
                      style={{
                        color:
                          msg.status === "seen" ? "#4ade80" : "#a5b4fc",
                        fontWeight: 500,
                      }}
                    >
                      {msg.status === "sent" && "✓"}
                      {msg.status !== "sent" && "✓✓"}
                    </span>
                  )}
                </div>

                {msg.reactions && msg.reactions.length > 0 && (
                  <div
                    style={{
                      display: "flex",
                      gap: 6,
                      marginTop: 6,
                      flexWrap: "wrap",
                    }}
                  >
                    {msg.reactions.map((r, i) => (
                      <span
                        key={i}
                        style={{
                          fontSize: 12,
                          background:
                            "linear-gradient(135deg, rgba(15,23,42,0.96), rgba(15,23,42,0.9))",
                          padding: "3px 8px",
                          borderRadius: 999,
                          border: "1px solid rgba(148,163,184,0.5)",
                          boxShadow:
                            "0 6px 14px rgba(15,23,42,0.8), inset 0 0 0 1px rgba(15,23,42,0.9)",
                        }}
                      >
                        {r.emoji} {r.count}
                      </span>
                    ))}
                  </div>
                )}

                {activeMessageId === msg.id && (
                  <div
                    style={{
                      display: "flex",
                      gap: 12,
                      marginTop: 8,
                      background:
                        "linear-gradient(135deg, rgba(15,23,42,0.96), rgba(15,23,42,0.9))",
                      padding: "6px 10px",
                      borderRadius: 999,
                      width: "fit-content",
                      border: "1px solid rgba(148,163,184,0.4)",
                      backdropFilter: "blur(18px)",
                      boxShadow:
                        "0 18px 40px rgba(15,23,42,0.95), 0 0 0 1px rgba(15,23,42,0.8)",
                    }}
                  >
                    <span
                      onClick={(ev) => {
                        ev.stopPropagation();
                        setReplyingTo(msg);
                        setActiveMessageId(null);
                      }}
                      style={{
                        cursor: "pointer",
                        fontSize: 13,
                        color: "#38bdf8",
                      }}
                    >
                      Reply
                    </span>

                    <span
                      onClick={(ev) => {
                        ev.stopPropagation();
                        forwardMessage(msg); // 🆕 Now opens ForwardModal
                        setActiveMessageId(null);
                      }}
                      style={{
                        cursor: "pointer",
                        fontSize: 13,
                        color: "#a855f7",
                      }}
                    >
                      Forward
                    </span>

                    {isMe && (
                      <span
                        onClick={(ev) => {
                          ev.stopPropagation();
                          socketRef.current?.emit("delete_message", {
                            messageId: msg.id,
                          });
                          setActiveMessageId(null);
                        }}
                        style={{
                          cursor: "pointer",
                          fontSize: 13,
                          color: "#f97373",
                        }}
                      >
                        Delete
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {isTyping && (
          <div
            style={{
              fontSize: 12,
              color: "#9ca3af",
              marginTop: 8,
              paddingLeft: 4,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "999px",
                background: "#38bdf8",
                boxShadow: "0 0 0 6px rgba(56,189,248,0.15)",
              }}
            />
            typing…
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* 🔁 REPLY BAR */}
      {replyingTo && (
        <div
          style={{
            padding: 10,
            background:
              "linear-gradient(135deg, rgba(15,23,42,0.96), rgba(15,23,42,0.92))",
            color: "#e5e7eb",
            fontSize: 12,
            borderTop: "1px solid rgba(30,64,175,0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
          }}
        >
          <span
            style={{
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              maxWidth: "92%",
            }}
          >
            Replying to: {replyingTo.content}
          </span>
          <span
            style={{
              cursor: "pointer",
              color: "#f97373",
              fontSize: 14,
            }}
            onClick={() => setReplyingTo(null)}
          >
            ✕
          </span>
        </div>
      )}

      {/* Input area */}
      <div
        style={{
          padding: 10,
          display: "flex",
          gap: 10,
          borderTop: "1px solid rgba(30,64,175,0.8)",
          background:
            "linear-gradient(135deg, rgba(15,23,42,0.96), rgba(15,23,42,0.98))",
        }}
      >
        <input
          value={message}
          onChange={handleChange}
          placeholder="Type a message"
          style={{
            flex: 1,
            padding: "11px 12px",
            borderRadius: 999,
            background:
              "radial-gradient(circle at top left, #020617 0, #020617 50%, #020617 100%)",
            border: "1px solid rgba(30,64,175,0.7)",
            color: "#f9fafb",
            fontSize: 14,
            outline: "none",
            boxShadow:
              "0 12px 28px rgba(15,23,42,0.9), inset 0 0 0 1px rgba(15,23,42,0.9)",
          }}
        />

        <button
          onClick={sendMessage}
          style={{
            padding: "10px 18px",
            borderRadius: 999,
            border: "none",
            background:
              "linear-gradient(135deg, #4f46e5, #7c3aed, #22c55e)",
            backgroundSize: "200% 200%",
            color: "#f9fafb",
            fontWeight: 600,
            cursor: "pointer",
            fontSize: 14,
            boxShadow:
              "0 16px 40px rgba(79,70,229,0.7), 0 0 0 1px rgba(15,23,42,0.9)",
            textTransform: "uppercase",
            letterSpacing: 1.2,
            transition:
              "transform 120ms ease-out, box-shadow 120ms ease-out, filter 120ms ease-out, background-position 220ms ease-out",
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
};


export default ChatWindow;
