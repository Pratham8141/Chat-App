import http from "http";
import app from "./app";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { ENV } from "./config/env";
import { pool } from "./config/db";
import { toggleReaction } from "./modules/message/reaction.service";


import {
  setOnline,
  setOffline,
  getSocketId,
  getOnlineUsers,
} from "./websocket/presence";


import {
  saveMessage,
  markMessagesSeen,
  deleteMessage,
} from "./modules/message/message.service";


import { saveGroupMessage } from "./modules/chat/groupMessage.service";


const PORT = 5000;

/* ============================
   HTTP + SOCKET SERVER
============================ */

const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*" },
});

/* ============================
   SOCKET AUTH
============================ */

io.use((socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error("No token"));

    const decoded = jwt.verify(token, ENV.JWT_SECRET) as any;
    (socket as any).user = decoded;
    next();
  } catch {
    next(new Error("Unauthorized"));
  }
});

/* ============================
   SOCKET CONNECTION
============================ */

io.on("connection", (socket) => {
  const userId = (socket as any).user.id;

  /* ============================
     ❤️ REACTIONS
  ============================ */

  socket.on("reaction", async ({ messageId, emoji }) => {
    try {
      const reactions = await toggleReaction(
        messageId,
        userId,
        emoji
      );

      io.emit("reaction_update", {
        messageId,
        reactions,
      });
    } catch (err) {
      console.error("Reaction error:", err);
    }
  });

  /* ============================
   🗑️ DELETE MESSAGE
============================ */

socket.on("delete_message", async ({ messageId }) => {
  const result = await deleteMessage(messageId, userId);

  if (!result) return;

  if (result.hardDeleted) {
    io.emit("message_removed", { messageId });
  } else {
    io.emit("message_deleted", { messageId });
  }
});



  /* ============================
     🟢 USER ONLINE
  ============================ */

  setOnline(userId, socket.id);
  io.emit("user_online", { userId });

  const onlineUserIds = Array.from(getOnlineUsers().keys());
  socket.emit("online_users", onlineUserIds);

  console.log("🟢 User online:", userId);

  /* ============================
     📩 PRIVATE MESSAGE (WITH REPLY)
  ============================ */

  socket.on(
    "private_message",
    async ({ to, content, replyTo }) => {
      try {
        // 1️⃣ Save message
        const saved = await saveMessage(
          userId,
          to,
          content,
          replyTo || null
        );

        // 2️⃣ Fetch enriched message (reply + reactions)
        const fullMessageRes = await pool.query(
          `
          SELECT 
            m.*,

            CASE 
              WHEN rm.id IS NOT NULL THEN
                json_build_object(
                  'id', rm.id,
                  'sender_id', rm.sender_id,
                  'content', rm.content
                )
              ELSE NULL
            END AS reply_message,

            COALESCE(
              json_agg(
                DISTINCT jsonb_build_object(
                  'emoji', r.emoji,
                  'count', r.count
                )
              ) FILTER (WHERE r.emoji IS NOT NULL),
              '[]'
            ) AS reactions

          FROM messages m
          LEFT JOIN messages rm ON rm.id = m.reply_to
          LEFT JOIN (
            SELECT message_id, emoji, COUNT(*)::int AS count
            FROM message_reactions
            GROUP BY message_id, emoji
          ) r ON r.message_id = m.id
          WHERE m.id = $1
          GROUP BY m.id, rm.id
          `,
          [saved.id]
        );

        const message = fullMessageRes.rows[0];

        // 3️⃣ Emit to receiver
        const receiverSocket = getSocketId(to);
        if (receiverSocket) {
          io.to(receiverSocket).emit(
            "private_message",
            message
          );
        }

        // 4️⃣ Echo to sender
        socket.emit("private_message", message);
      } catch (err) {
        console.error("Message error:", err);
      }
    }
  );

  /* ============================
     👁️ MESSAGE SEEN
  ============================ */

  socket.on("message_seen", async ({ senderId }) => {
    try {
      await markMessagesSeen(senderId, userId);

      const senderSocket = getSocketId(senderId);
      if (senderSocket) {
        io.to(senderSocket).emit("messages_seen", {
          by: userId,
        });
      }
    } catch (err) {
      console.error("Seen error:", err);
    }
  });

  /* ============================
     ⌨️ TYPING
  ============================ */

  socket.on("typing", ({ receiverId }) => {
    const s = getSocketId(receiverId);
    if (s) io.to(s).emit("typing", { userId });
  });

  socket.on("stop_typing", ({ receiverId }) => {
    const s = getSocketId(receiverId);
    if (s)
      io.to(s).emit("stop_typing", {
        userId,
      });
  });

  /* ============================
     ❌ DISCONNECT
  ============================ */

  socket.on("disconnect", async () => {
    setOffline(userId);

    await pool.query(
      "UPDATE users SET last_seen = NOW() WHERE id = $1",
      [userId]
    );

    io.emit("user_offline", { userId });
    console.log("🔴 User offline:", userId);
  });

  /* ============================
     📦 GROUP CHAT
  ============================ */

  socket.on("join_group", (groupId: string) => {
    socket.join(groupId);
  });

  socket.on(
    "group_message",
    async ({ groupId, content }) => {
      const msg = await saveGroupMessage(
        groupId,
        userId,
        content
      );
      io.to(groupId).emit("group_message", msg);
    }
  );
});

/* ============================
   START SERVER
============================ */

server.listen(PORT, () => {
  console.log(
    `🚀 Server running on http://localhost:${PORT}`
  );
});
