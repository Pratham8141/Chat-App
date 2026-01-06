Real-Time Chat Application (WhatsApp-Style)

This project is a full-stack real-time chat application inspired by WhatsApp. It is built using React (TypeScript) on the frontend and Node.js with Socket.IO and PostgreSQL on the backend. The application focuses on real-time communication, scalable architecture, and message interaction features.

Features

The application supports one-to-one private messaging with real-time delivery using Socket.IO. Users can see online and offline status, last seen timestamps, typing indicators, and read receipts (sent/seen). Messages are stored persistently in PostgreSQL and loaded using pagination/infinite scroll.

Users can react to messages using emojis, with reactions updating in real time. Messages support soft deletion (WhatsApp-style “This message was deleted”), forwarding, and replies using a reply_to reference in the database. JWT-based authentication is used for both REST APIs and socket connections.

Tech Stack

Frontend: React (TypeScript), Vite, Socket.IO Client, Axios
Backend: Node.js, Express, Socket.IO, PostgreSQL, JWT Authentication

Project Structure

chat-app/
├── chat-app-frontend/
│ └── src/
│ ├── api/ (Axios API layer)
│ ├── auth/ (Token handling and helpers)
│ ├── socket/ (Socket.IO client setup)
│ ├── pages/Chat/
│ │ ├── ChatWindow.tsx (Main chat logic – messages, reactions, delete, forward, reply, typing, pagination)
│ │ └── UserList.tsx (User list, online status, unread counts)
│ ├── App.tsx
│ └── main.tsx
│
└── chat-app-backend/
└── src/
├── config/ (DB connection, environment variables)
├── middlewares/ (Auth middleware)
├── modules/message/ (Message services, reactions, delete, history)
├── websocket/ (Presence tracking: online/offline users)
├── app.ts (Express app setup)
└── server.ts (HTTP + Socket.IO server, all socket events)

Database Schema (Core)

messages table stores id, sender_id, receiver_id, content, reply_to, is_deleted, status (sent/seen), and created_at.
message_reactions table stores message_id, user_id, and emoji, allowing one reaction per user per message.

Backend Flow

The backend uses Express for REST APIs and Socket.IO for real-time communication. JWT is verified during socket connection. When a user connects, their socket ID is stored for presence tracking. Messages are saved to PostgreSQL and emitted in real time to the receiver. Reactions, deletes, forwards, typing indicators, and read receipts are all handled through socket events.

Frontend Flow

The frontend maintains a single socket connection and listens for real-time events. ChatWindow.tsx (500+ lines) handles message rendering, scrolling, pagination, reactions, delete, forward, reply, typing, and read receipts. UserList.tsx shows all users, online/offline status, and unread message counts.

Setup Instructions

Backend:

cd chat-app-backend

npm install

Create .env with PORT, DATABASE_URL, JWT_SECRET

Start server using:
npx ts-node-dev src/server.ts

Frontend:

cd chat-app-frontend

npm install

npm run dev


Known Limitations

UI is intentionally minimal. Forwarding currently uses a basic selection approach. No group chats, media sharing, or message editing yet.

Learning Outcome

This project demonstrates real-time system design, Socket.IO architecture, syncing REST and WebSocket data, handling message duplication issues, scalable presence tracking, and building WhatsApp-style chat functionality from scratch using a production-style folder structure.

Author: Pratham Sharma
