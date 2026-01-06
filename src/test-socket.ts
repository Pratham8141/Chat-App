import { io } from "socket.io-client";

// 🔑 PASTE YOUR JWT TOKEN HERE (FROM /api/auth/login)
const TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImVlNGEyOTk2LTI1MmYtNDI2NC1hNTMyLTdlMmI2YmI0M2ZlOSIsImlhdCI6MTc2NzE4MjE5MiwiZXhwIjoxNzY3Nzg2OTkyfQ.aSsiNpNQjFMD_tqlv-y7hkiIjJaHoJUOjhI8voOkLHI";

// 👤 RECEIVER USER ID (UUID FROM DB)
// If you have only ONE user, register a second user first
const RECEIVER_ID = "f542c2ba-f45b-4164-8b64-35b9da2fb9d8";

const socket = io("http://localhost:5000", {
  auth: {
    token: TOKEN,
  },
});

socket.on("connect", () => {
  console.log("🟢 Connected to socket:", socket.id);

  // send test message
  socket.emit("private_message", {
    to: RECEIVER_ID,
    content: "Hello from test-socket!",
  });
});

socket.on("private_message", (msg) => {
  console.log("📩 Incoming message:", msg);
});

socket.on("message_sent", (msg) => {
  console.log("✅ Message sent ACK:", msg);
});

socket.on("connect_error", (err) => {
  console.error("❌ Socket connection error:", err.message);
});
// 👥 Join group
socket.emit("join_group", "b8f24937-fd6e-4e6d-bb1c-32a84bce30f5");

// 💬 Send group message
socket.emit("group_message", {
  groupId: "b8f24937-fd6e-4e6d-bb1c-32a84bce30f5",
  content: "Hello Group 👋",
});

// 📥 Receive group messages
socket.on("group_message", (msg) => {
  console.log("📢 Group message:", msg);
});
