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
            lastMessageId: response?.id,
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
            lastMessageId: response?.id,
            lastMessageCreatedAt: new Date(),
          },
          include: {
            chatUser: true,
            currentUser: true,
          },
        });
        conversationId = createdConversation;
      }
      const senderSocketId = onlineUsers[senderId];
      const receiverSocketId = onlineUsers[receiverId];
      const senderConversation = {
        ...conversationId,
        chatUser: conversationId?.chatUser,
        currentUser: conversationId?.currentUser,
      };
      const receiverConversation = {
        ...conversationId,
        chatUser: conversationId?.currentUser, // sender
        currentUser: conversationId?.chatUser, // receiver
      };
      io.to(String(senderSocketId)).emit("newMessage", {
        clientMessageId,
        response,
        lastMessageId: response?.id,
        conversationId: senderConversation,
        targetChatUserId: receiverId,
        type,
      });

      io.to(String(receiverSocketId)).emit("newMessage", {
        clientMessageId,
        response,
        lastMessageId: response?.id,
        conversationId: receiverConversation,
        targetChatUserId: senderId,
        type,
      });
    }
  );
  socket.on(
    "sendGroupMessage",
    async ({ groupId, message, messageSenderId }) => {
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

        group.groupMembers.map((user) => {
          const socketId = onlineUsers[user?.userId];
          io.to(String(socketId)).emit("receiveGropMessage", {
            groupId: `group-${groupId}`,
            message,
            lastMessageId: createMessage?.id,
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
    async ({ messageId, senderId, receiverId, type, chatType }) => {
      console.log("get this delete signal at server");
      try {
        if (!messageId || !senderId) {
          socket.emit("message:error", {
            message: "messageId and senderId are required",
          });
          return;
        }
        let message;
        let groupChat = null;
        let privateChat = null;
        const isGroupChat = chatType === "group" ? true : false;
        if (isGroupChat) {
          message = await prisma.groupMessage.findUnique({
            where: { id: messageId },
            include: {
              group: {
                select: {
                  groupMembers: true,
                },
              },
            },
          });
          groupChat = message;
        } else {
          message = await prisma.messages.findUnique({
            where: { id: messageId },
          });
          privateChat = message;
        }

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
        if (isGroupChat) {
          if (groupChat?.userId !== senderId) {
            socket.emit("message:error", {
              message: "You are not authorized to delete this message",
            });
            return;
          }
        } else {
          if (privateChat?.senderId !== senderId) {
            socket.emit("message:error", {
              message: "You are not authorized to delete this message",
            });
            return;
          }
        }

        if (isGroupChat) {
          groupChat?.group.groupMembers.map((user) => {
            const socketId = onlineUsers[user?.userId];
            io.to(String(socketId)).emit("message:delete", {
              groupId: `group-${senderId}`,
              messageId: messageId?.id,
              chatType: "group",
            });
          });
        }
        const roomId =
          senderId < receiverId
            ? `${senderId}-${receiverId}`
            : `${receiverId}-${senderId}`;

        if (type == "FOR_ME") {
          if (isGroupChat) {
            await prisma.groupMessage.update({
              where: { id: messageId },
              data: {
                deletedByMeId: senderId,
              },
            });
            socket.emit("message:deleted", {
              messageId,
              type: "FOR_ME",
              chatType: "group",
            });
          } else {
            await prisma.messages.update({
              where: { id: messageId },
              data: {
                deletedByMeId: senderId,
              },
            });
            socket.emit("message:deleted", {
              messageId,
              type: "FOR_ME",
              chatType: "chat",
            });
          }
        }
        if (type === "FOR_EVERYONE") {
          if (isGroupChat) {
            await prisma.groupMessage.update({
              where: { id: messageId },
              data: { deletedForAll: true, text: null },
            });
            groupChat?.group.groupMembers.map((user) => {
              const socketId = onlineUsers[user?.userId];
              io.to(String(socketId)).emit("message:deleted", {
                messageId: messageId,
                chatType: "group",
                type: "FOR_EVERYONE",
              });
            });
          } else {
            await prisma.messages.update({
              where: { id: messageId },
              data: { deletedForAll: true, text: null },
            });

            io.to(roomId).emit("message:deleted", {
              messageId,
              type: "FOR_EVERYONE",
              chatType: "chat",
            });
          }
        }
      } catch (error) {
        socket.emit("message:error", {
          message: error,
        });
      }
    }
  );
  socket.on(
    "sidebar:update",
    async ({ chatType, senderId, receiverId, chatListId, messageId }) => {
      console.log(
        "getd signal for sidebar update at derver side",
        "tye",
        chatType,
        "senderId",
        senderId,
        "receiverId",
        receiverId,
        "chatLostId",
        chatListId,
        "messageId",
        messageId
      );
      const senderSocketId = onlineUsers[senderId];
      const receiverSocketId = onlineUsers[receiverId];
      if (chatType === "group") {
        const groupConversation = await prisma.group.findUnique({
          where: { id: Number(chatListId) },
          include: {
            messages: {
              select: {
                id: true,
                text: true,
                deletedByMeId: true,
                deletedForAll: true,
                createdAt: true,
              },
            },
            groupMembers: {
              select: {
                userId: true,
              },
            },
          },
        });
        const lastMessage = groupConversation?.messages.find(
          (msg) => msg.id === messageId
        );
        if (lastMessage) {
          if (lastMessage?.deletedForAll) {
            // io.to(String(senderSocketId)).emit("sidebar:update", {
            //   lastMessage: "This message was deleted",
            //   sidebarChatId: groupConversation?.id,
            //   type: "group",
            //   lastMessageId: null,
            //   lastMessageCreatedAt: new Date(),
            //   deleteType: "For_Everypone",
            // });
            groupConversation?.groupMembers.forEach((member) => {
              const socketId = onlineUsers[Number(member?.userId)];
              console.log(socketId, member);
              io.to(String(socketId)).emit("sidebar:update", {
                lastMessage: "This message was deleted",
                sidebarChatId: groupConversation?.id,
                type: "group",
                lastMessageId: lastMessage?.id ?? null,
                lastMessageCreatedAt: new Date(),
                deleteType: "For_Everypone",
              });
            });
            console.log("send socket for delete for everryon , dleeteBy me");
          }
          if (lastMessage.deletedByMeId === Number(senderId)) {
            const prevLastMessage = groupConversation?.messages
              ?.filter((msg) => msg?.deletedByMeId !== Number(senderId))
              .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
              .at(-1);
            io.to(String(senderSocketId)).emit("sidebar:update", {
              lastMessage: prevLastMessage
                ? prevLastMessage.text
                  ? prevLastMessage?.text
                  : "This message was deleted"
                : "No message yet",
              sidebarChatId: groupConversation?.id,
              type: "group",
              lastMessageId: prevLastMessage?.id ?? null,
              lastMessageCreatedAt: prevLastMessage?.createdAt ?? new Date(),
              deleteType: "For_Me",
            });
            console.log("send socket for delete for me , dleeteBy me");
          }
        }
        return;
      }
      const chatConversation = await prisma.chatConversation.findUnique({
        where: { id: Number(chatListId) },
      });
      if (!chatConversation) {
        console.log("this conversation is not exist");
        return;
      }
      const deleteMessage = await prisma.messages.findUnique({
        where: {
          id: messageId,
        },
      });
      console.log("deleted message", deleteMessage);
      const roomId =
        senderId < receiverId
          ? `${senderId}-${receiverId}`
          : `${receiverId}-${senderId}`;
      if (deleteMessage?.deletedForAll) {
        console.log(onlineUsers);

        console.log(senderSocketId, receiverSocketId);

        io.to(String(senderSocketId)).emit("sidebar:update", {
          lastMessage: "This message was deleted",
          sidebarChatId: chatConversation.id,
          type: chatType,
          lastMessageId: null,
          lastMessageCreatedAt: null,
          deleteType: "For_Everypone",
        });
        socket.to(String(receiverSocketId)).emit("sidebar:update", {
          lastMessage: "This message was deleted",
          sidebarChatId: chatConversation.id,
          type: chatType,
          lastMessageId: null,
          lastMessageCreatedAt: null,
          deleteType: "For_Everypone",
        });
        return;
      }
      const messages = await prisma.messages.findMany();
      const lastMessages = messages
        .filter(
          (msg) =>
            (msg.senderId === senderId && msg.receiverId === receiverId) ||
            (msg.senderId === receiverId && msg.receiverId === senderId)
        )
        .filter((msg) => msg.deletedByMeId !== senderId)
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      socket.emit("sidebar:update", {
        lastMessage: lastMessages
          ? lastMessages[0]?.text
            ? lastMessages[0]?.text
            : "This message was deleted"
          : "No message yet",
        sidebarChatId: chatConversation.id,
        type: chatType,
        lastMessageId: lastMessages
          ? lastMessages[0]?.id
          : "This message was deleted",
        lastMessageCreatedAt: lastMessages ? lastMessages[0]?.createdAt : null,
        deleteType: "For_Me",
      });
    }
  );
  socket.on("status:Read", async ({ messageId }) => {
    const message = await prisma.messages.update({
      where: { id: messageId },
      data: {
        status: "Read",
      },
    });

    const senderSocketId = onlineUsers[message?.senderId];

    io.to(String(senderSocketId)).emit("status:Read", {
      messageId,
    });
  });
  socket.on(
    "editMessage",
    async ({ messageId, senderId, newText, receiverId, type }) => {
      try {
        if (!messageId || !senderId || !newText) {
          return socket.emit("message:error", {
            message: "Required data missing",
          });
        }

        if (type === "chat") {
          const message = await prisma.messages.findUnique({
            where: { id: messageId },
          });

          if (!message || message.senderId !== senderId) return;
          await prisma.messages.update({
            where: { id: messageId },
            data: { text: newText },
          });

          const roomId =
            senderId < receiverId
              ? `${senderId}-${receiverId}`
              : `${receiverId}-${senderId}`;

          io.to(roomId).emit("editMessage", {
            messageId,
            newText,
            chatType: "chat",
          });
        }

        if (type === "group") {
          const message = await prisma.groupMessage.findUnique({
            where: { id: messageId },
          });

          if (!message || message.userId !== senderId) return;

          const groupChat = await prisma.groupMessage.update({
            where: { id: messageId },
            data: { text: newText },
            include: {
              group: {
                select: {
                  groupMembers: true,
                },
              },
            },
          });

          groupChat?.group.groupMembers.forEach((user: any) => {
            const socketId = onlineUsers[user.userId];
            if (socketId) {
              io.to(socketId).emit("editMessage", {
                messageId,
                newText,
                chatType: "group",
              });
            }
          });
        }
      } catch (error) {
        socket.emit("message:error", {
          message: "Something went wrong while editing message",
        });
      }
    }
  );

  socket.on("profile:update", async (data) => {
    try {
      const { userId, image, name, about } = data;

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
      });
    } catch (err: unknown) {
      let error = "Something went wrong in profile update";
      if (err instanceof Error) {
        error = err.message;
      }

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
    io.emit("user-disconnected", disconnectedUserId);
  });
});

server.listen(PORT, () => {
  console.log(`server is listen on port ${PORT}`);
});
app.use(router);
app.get("/", (req, res) => {
  return res.send(`server is running successfully on port ${PORT}`);
});
