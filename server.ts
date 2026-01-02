import "dotenv/config";
import express from "express";
import router from "./route";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import axios from "axios";
import { prisma } from "./lib/prisma";
import { use } from "react";
const PORT = process.env.PORT || 8050;
const app = express();
app.use(cors({ origin: "http://localhost:3000" }));
export const server = http.createServer(app);
export const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
  },
});
export const onlineUsers: { [key: string]: string } = {};
app.use(express.json());
io.on("connection", (socket) => {
  console.log("socket connected:", socket.id);
  socket.on("online-users", (userId) => {
    // console.log("request for online user from clien ", userId);
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
  socket.on(
    "sendMessage",
    async ({ clientMessageId, senderId, receiverId, text, type }) => {
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
      socket.emit("status:send", { clientMessageId });
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
      console.log("message gated successfully", text);
      const senderSocketId = onlineUsers[senderId];
      const receiverSocketId = onlineUsers[receiverId];
      console.log(senderSocketId, "Sender", receiverSocketId, "receiver");
      io.to(String(senderSocketId)).emit("newMessage", {
        clientMessageId,
        response,
        conversationId: conversationId,
        targetChatUserId: receiverId,
        type,
      });
      io.to(String(receiverSocketId)).emit("newMessage", {
        clientMessageId,
        response,
        conversationId: conversationId,
        targetChatUserId: receiverId,
        type,
      });
    }
  );
  socket.on(
    "sendGroupMessage",
    async ({ groupId, message, messageSenderId }) => {
      console.log(
        "geted sendMessagesignal at server",
        groupId,
        message,
        messageSenderId
      );
      try {
        const group = await prisma.group.findUnique({
          where: {
            id: Number(groupId),
          },
          select: {
            groupMembers: {
              select: {
                userId: true,
              },
            },
          },
        });
        if (!group) {
          throw new Error("This group is not available");
        }
        const isMember = group.groupMembers.some(
          (user) => String(user.userId) === String(messageSenderId)
        );
        if (!isMember) {
          throw new Error("Only group joined user can send message");
        }
        const createMessage = await prisma.groupMessage.create({
          data: {
            text: message,
            createdAt: new Date(),
            groupId: Number(groupId),
            userId: messageSenderId,
          },
          include: {
            sender: {
              select: {
                name: true,
                image: true,
                id: true,
              },
            },
          },
        });
        group.groupMembers.map((user) =>
          console.log(user.userId, "user id is here ")
        );
        group.groupMembers.map((user) => {
          const socketId = onlineUsers[user?.userId];
          io.to(String(socketId)).emit("receiveGropMessage", {
            groupId: `group-${groupId}`,
            message,
            messageId: createMessage?.id,
            sender: createMessage?.sender,
          });
        });
      } catch (error) {
        console.log(error);
      }
    }
  );
  socket.on("status:delivered", async ({ messageId }) => {
    const message = await prisma.messages.findUnique({
      where: { id: messageId },
    });

    if (!message) return;

    await prisma.messages.update({
      where: { id: messageId },
      data: { status: "Delivered" },
    });

    const senderSocketId = onlineUsers[message.senderId];

    if (senderSocketId) {
      io.to(senderSocketId).emit("status:delivered", {
        messageId,
      });
    }
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
            data: { deletedForAll: true, text: null },
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
  socket.on("status:Read", async ({ messageId }) => {
    const message = await prisma.messages.update({
      where: { id: messageId },
      data: {
        status: "Read",
      },
    });
    // console.log(message);
    // console.log(onlineUsers);
    const senderSocketId = onlineUsers[message?.senderId];
    console.log("Gated signal in server side for read", senderSocketId);

    io.to(String(senderSocketId)).emit("status:Read", {
      messageId,
    });
  });
  socket.on(
    "editMessage",
    async ({ messageId, senderId, newText, receiverId }) => {
      try {
        const roomId =
          senderId < receiverId
            ? `${senderId}-${receiverId}`
            : `${receiverId}-${senderId}`;
        if (!messageId || !senderId || !newText || !receiverId) {
          socket.emit("editMessage:error", {
            message: "Required data is missing. Unable to edit the message.",
          });
        }
        const isMessage = await prisma.messages.findUnique({
          where: {
            id: messageId,
          },
        });
        if (isMessage?.senderId !== senderId) {
          socket.emit("editMessage:error", {
            message: "The owner of this message can only update this message",
          });
          return;
        }
        if (!isMessage || isMessage?.deletedByMeId !== null) {
          socket.emit("editMessage:error", {
            message: "Message not found",
          });
        }
        await prisma.messages.update({
          where: { id: messageId },
          data: {
            text: newText,
          },
        });

        io.to(roomId).emit("editMessage", { messageId, newText });
        // deletedByMeId
      } catch (error) {}
    }
  );
  socket.on("profile:update", async (data) => {
    try {
      console.log(onlineUsers);
      const { userId, image, name, about } = data;
      console.log(
        "geted signal from client to server for profile update",
        userId,
        image,
        name,
        about
      );
      if (!userId) throw new Error("User ID is required");

      // Update user in database
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          image,
          name,
          about,
        },
      });

      // Emit updated profile to all users or to specific users
      Object.keys(onlineUsers).forEach((user) => {
        const socketId = onlineUsers[user];
        io.to(String(socketId)).emit("profile:updated", {
          userId: updatedUser.id,
          image: updatedUser.image,
          name: updatedUser.name,
          about: updatedUser.about,
        });
        console.log("sendele signal from server to clinet for updted proble");
      });
    } catch (err: unknown) {
      let error = "Something went wrong in profile update";
      if (err instanceof Error) {
        error = err.message;
      }
      console.error("Profile update error:", error);

      socket.emit("profile:error", {
        message: error,
      });
    }
  });
  socket.on("disconnect", async () => {
    const userId = socket.data.userId;
    if (!userId) return;
    console.log("socket disconnected:", socket.id);
    const disconnectedUserId = Object.keys(onlineUsers).find(
      (id) => onlineUsers[id] === socket.id
    );
    if (disconnectedUserId) {
      delete onlineUsers[disconnectedUserId];
    }
    const userUpadted = await prisma.user.update({
      where: { id: Number(userId) },
      data: {
        LastActiveAt: new Date(),
      },
    });
    // console.log("user last login updated", userUpadted);
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
