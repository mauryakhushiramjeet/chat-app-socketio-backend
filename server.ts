import "dotenv/config";
import express from "express";
import router from "./route";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import axios from "axios";
import { prisma } from "./lib/prisma";
const PORT = process.env.PORT || 8050;
const app = express();
app.use(cors({ origin: "http://localhost:3000" }));
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
  },
});
const onlineUsers: { [key: string]: string } = {};
app.use(express.json());
io.on("connection", (socket) => {
  console.log("socket connected:", socket.id);
  socket.on("online-users", (userId) => {
    console.log("request for online user from clien ", userId);
    onlineUsers[userId] = socket.id;
    socket.data.userId = userId;
    io.emit("online-users", Object.keys(onlineUsers));
  });

  socket.on("joinRoom", ({ senderId, receiverId }) => {
    const roomId =
      senderId < receiverId
        ? `${senderId}-${receiverId}`
        : `${receiverId}-${senderId}`;
    socket.join(roomId);
    const clients = io.sockets.adapter.rooms.get(roomId);
    console.log("ROOM:", roomId);
    console.log("TOTAL SOCKETS:", clients ? clients.size : 0);
  });
  socket.on("typing", ({ senderId, receiverId }) => {
    console.log("typing signle recive");
    const roomId =
      senderId < receiverId
        ? `${senderId}-${receiverId}`
        : `${receiverId}-${senderId}`;

    socket.to(roomId).emit("userTyping", {
      senderId,
      receiverId,
    });
  });
  socket.on("stopTyping", ({ senderId, receiverId }) => {
    const roomId =
      senderId < receiverId
        ? `${senderId}-${receiverId}`
        : `${receiverId}-${senderId}`;

    socket.to(roomId).emit("userStopTyping", {
      senderId,
      receiverId,
    });
  });
  socket.on("sendMessage", async ({ senderId, receiverId, text }) => {
    const roomId =
      senderId < receiverId
        ? `${senderId}-${receiverId}`
        : `${receiverId}-${senderId}`;
    const addMessage = await axios.post("http://localhost:8085/addMessage", {
      senderId,
      receiverId,
      text,
    });
    const response = addMessage.data.messages;
    let conversationId = null;
    const conversation = await prisma.chatConversation.findFirst({
      where: {
        OR: [
          { chatUserId: receiverId, currentUserId: senderId },
          { chatUserId: senderId, currentUserId: receiverId },
        ],
      },
      include: {
        chatUser: true,
      },
    });
    if (conversation) {
      await prisma.chatConversation.update({
        where: { id: conversation?.id },
        data: {
          lastMessage: text,
          lastMessageCreatedAt: new Date(),
        },
      });
      conversationId = conversation;
    }
    if (!conversation) {
      const createdConversation = await prisma.chatConversation.create({
        data: {
          currentUserId: senderId,
          chatUserId: receiverId,
          lastMessage: text,
          lastMessageCreatedAt: new Date(),
        },
        include: {
          chatUser: true,
        },
      });
      conversationId = createdConversation;
    }

    io.to(roomId).emit("newMessage", {
      response,
      conversationId: conversationId,
    });
  });
  socket.on(
    "message:delete",
    async ({ messageId, senderId, receiverId, type }) => {
      try {
        if (!messageId || !senderId) {
          socket.emit("message:error", {
            message: "messageId and senderId are required",
          });
          return;
        }
        const message = await prisma.messages.findUnique({
          where: { id: messageId },
        });
        if (!message) {
          socket.emit("message:error", {
            message: "message not found",
          });
          return;
        }
        if (message.deletedByMeId === senderId) {
          socket.emit("message:error", {
            message: "message already deleted",
          });
          return;
        }
        if (message.senderId !== senderId) {
          console.log(
            message.text,
            "this message senderId is",
            message?.senderId,
            "and the signle of this sender Id is ",
            senderId
          );
          socket.emit("message:error", {
            message: "You are not authorized to delete this message",
          });
          return;
        }
        const roomId =
          senderId < receiverId
            ? `${senderId}-${receiverId}`
            : `${receiverId}-${senderId}`;

        if (type == "FOR_ME") {
          await prisma.messages.update({
            where: { id: messageId },
            data: {
              deletedByMeId: senderId,
            },
          });
          socket.emit("message:deleted", {
            messageId,
            type: "FOR_ME",
          });
        }
        if (type === "FOR_EVERYONE") {
          console.log("server get signal for message delete everyOne");
          await prisma.messages.update({
            where: { id: messageId },
            data: { deletedForAll: true,text:null },
          });

          io.to(roomId).emit("message:deleted", {
            messageId,
            type: "FOR_EVERYONE",
          });
        }
      } catch (error) {
        socket.emit("message:error", {
          message: error,
        });
      }
    }
  );
console.log(onlineUsers,",dhkjhkjhkjhkhkjhdkjhfkjsh")
  socket.on("disconnect", async () => {
    const userId = socket.data.userId;
    if (!userId) return;
    console.log("socket disconnected:", socket.id);
    const disconnectedUserId = Object.keys(onlineUsers).find(
      (id) => onlineUsers[id] === socket.id
    );
    console.log(disconnectedUserId, "disconnected user id");
    if (disconnectedUserId) {
      delete onlineUsers[disconnectedUserId];
    }
    const userUpadted = await prisma.user.update({
      where: { id: Number(userId) },
      data: {
        LastActiveAt: new Date(),
      },
    });
    console.log("user last login updated", userUpadted);
    io.emit("user-disconnected", disconnectedUserId);
    console.log(onlineUsers);
  });
});

server.listen(PORT, () => {
  console.log(`server is listen on port ${PORT}`);
});
app.use(router);
app.get("/", (req, res) => {
  return res.send(`server is running successfully on port ${PORT}`);
});
