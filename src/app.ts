import express from "express";
import cors from "cors";

import authRoutes from "./modules/auth/auth.routes";
import chatRoutes from "./modules/chat/chat.routes";
import messageRoutes from "./modules/message/message.routes";
import groupRoutes from "./modules/chat/group.routes";


const app = express();
app.get("/", (req, res) => {
  res.send("Chat App Backend Running 🚀");
});

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/groups", groupRoutes);


export default app;
