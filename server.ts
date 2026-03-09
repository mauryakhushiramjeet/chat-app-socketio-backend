import "dotenv/config";
import express from "express";
import router from "./route.js";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import { prisma } from "./lib/prisma.js";
const PORT = process.env.PORT || 8050;
const app = express();
app.use(cors({ origin: process.env.FRONTEND_URL }));
export const server = http.createServer(app);
export const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL,
  },
});
export const onlineUsers: { [key: string]: string } = {};
export const userChatId: { [key: string]: string } = {};

app.use((req, res, next) => {
  res.setHeader("ngrok-skip-browser-warning", "true");
  next();
});
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
io.on("connection", (socket) => {
  console.log("socket connected:", socket.id);
  socket.on("online-users", (userId) => {
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
  socket.on("typing", async ({ senderId, receiverId, type, groupId }) => {
    if (type === "group") {
      const memebers = await prisma.groupMembers.findMany({
        where: {
          groupId: Number(groupId),
        },
        select: {
          userId: true,
        },
      });
      const reciversMember = memebers.filter((m) => m.userId !== senderId);
      reciversMember.map((m) => {
        const reciversSocketId = onlineUsers[m.userId];
        socket.to(String(reciversSocketId)).emit("userTyping", {
          senderId,
          receiverId: m.userId,
          type,
          groupId,
        });
      });
    } else {
      const roomId =
        senderId < receiverId
          ? `${senderId}-${receiverId}`
          : `${receiverId}-${senderId}`;
      socket.to(String(onlineUsers[receiverId])).emit("userTyping", {
        senderId,
        receiverId,
        type,
      });
    }
  });
  socket.on("stopTyping", async ({ senderId, receiverId, type, groupId }) => {
    if (type === "group") {
      const memebers = await prisma.groupMembers.findMany({
        where: {
          groupId: Number(groupId),
        },
        select: {
          userId: true,
        },
      });
      const reciversMember = memebers.filter((m) => m.userId !== senderId);
      reciversMember.map((m) => {
        const reciversSocketId = onlineUsers[m.userId];
        socket.to(String(reciversSocketId)).emit("userStopTyping", {
          senderId,
          receiverId: m.userId,
          type,
          groupId,
        });
      });
    } else {
      // const roomId =
      //   senderId < receiverId
      //     ? `${senderId}-${receiverId}`
      //     : `${receiverId}-${senderId}`;
      const reciversSocketId = onlineUsers[receiverId];
      socket.to(reciversSocketId).emit("userStopTyping", {
        senderId,
        receiverId,
        type,
        groupId: null,
      });
    }
  });
  socket.on("chatId", ({ userId, chatId }) => {
    if (!chatId) return;
    if (userChatId[userId]) {
      if (userChatId[userId] !== `chatId_${chatId}`) {
        userChatId[userId] = `chatId_${chatId}`;
      }
    } else {
      userChatId[userId] = `chatId_${chatId}`;
    }
  });
  socket.on("status:delivered", async ({ messageId, conversationId }) => {
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
        conversationId,
      });
    }
  });

  socket.on(
    "message:delete",
    async ({ messageId, senderId, receiverId, type, chatType }) => {
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
              lastMessageCreatedAt: new Date(),
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
              lastMessageCreatedAt: new Date(),
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
                lastMessageCreatedAt: new Date(),
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
              lastMessageCreatedAt: new Date(),
            });
          }
        }
      } catch (error) {
        socket.emit("message:error", {
          message: error,
        });
      }
    },
  );
  socket.on(
    "sidebar:update",
    async ({ chatType, senderId, receiverId, chatListId, messageId }) => {
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
        const clearChat = await prisma.chatClear.findUnique({
          where: {
            userId_groupId: {
              userId: Number(senderId),
              groupId: Number(chatListId),
            },
          },
        });
        const lastMessage = groupConversation?.messages.find(
          (msg) => msg.id === messageId,
        );

        if (lastMessage) {
          if (lastMessage?.deletedForAll) {
            groupConversation?.groupMembers.forEach((member) => {
              const socketId = onlineUsers[Number(member?.userId)];
              io.to(String(socketId)).emit("sidebar:update", {
                lastMessage: "This message was deleted",
                sidebarChatId: groupConversation?.id,
                type: "group",
                lastMessageId: lastMessage?.id ?? null,
                lastMessageCreatedAt: new Date(),
                deleteType: "For_Everypone",
              });
            });
          }
          if (lastMessage.deletedByMeId === Number(senderId)) {
            const prevLastMessage = groupConversation?.messages
              ?.filter((msg) => msg?.deletedByMeId !== Number(senderId))
              .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
              .at(-1);
            if (
              clearChat &&
              prevLastMessage &&
              prevLastMessage?.createdAt <= clearChat?.deletedAt
            ) {
              const socketId = onlineUsers[Number(senderId)];

              io.to(String(socketId)).emit("sidebar:update", {
                lastMessage: "",
                sidebarChatId: groupConversation?.id,
                type: "group",
                lastMessageId: "",
                lastMessageCreatedAt: null,
                deleteType: "For_Me",
              });
              return;
            }

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
          }
        }
        return;
      }
      const chatConversation = await prisma.chatConversation.findUnique({
        where: { id: Number(chatListId) },
      });
      if (!chatConversation) {
        return;
      }
      const deleteMessage = await prisma.messages.findUnique({
        where: {
          id: messageId,
        },
      });
      const clearChat = await prisma.chatClear.findUnique({
        where: {
          userId_chatPartnerUserId: {
            userId: Number(senderId),
            chatPartnerUserId: Number(receiverId),
          },
        },
      });
      if (deleteMessage?.deletedForAll) {
        io.to(String(senderSocketId)).emit("sidebar:update", {
          lastMessage: "This message was deleted",
          sidebarChatId: chatConversation.id,
          type: chatType,
          lastMessageId: null,
          lastMessageCreatedAt: new Date(),
          deleteType: "For_Everypone",
        });
        socket.to(String(receiverSocketId)).emit("sidebar:update", {
          lastMessage: "This message was deleted",
          sidebarChatId: chatConversation.id,
          type: chatType,
          lastMessageId: null,
          lastMessageCreatedAt: new Date(),
          deleteType: "For_Everypone",
        });
        return;
      }
      const messages = await prisma.messages.findMany({
        where: {
          OR: [
            { senderId: senderId, receiverId: receiverId },
            { senderId: receiverId, receiverId: senderId },
          ],
        },
        orderBy: { createdAt: "desc" },
      });
      const lastValidMessage = messages.find(
        (msg) =>
          msg.deletedByMeId !== senderId && // deleted for me ignore
          msg.deletedForAll !== true, // deleted for everyone ignore
      );
      if (
        clearChat &&
        lastValidMessage &&
        lastValidMessage?.createdAt <= clearChat?.deletedAt
      ) {
        const socketId = onlineUsers[Number(senderId)];

        io.to(String(socketId)).emit("sidebar:update", {
          lastMessage: "",
          sidebarChatId: chatConversation.id,
          type: "chat",
          lastMessageId: "",
          lastMessageCreatedAt: null,
          deleteType: "For_Me",
        });
        return;
      }
      socket.emit("sidebar:update", {
        lastMessage: lastValidMessage
          ? (lastValidMessage.text ?? "Send a file")
          : "",
        sidebarChatId: chatConversation.id,
        type: chatType,
        lastMessageId: lastValidMessage
          ? lastValidMessage?.id
          : "This message was deleted",
        lastMessageCreatedAt: lastValidMessage?.createdAt ?? null,
        deleteType: "For_Me",
      });
    },
  );

  socket.on("status:Read", async ({ messageId, conversationId }) => {
    const message = await prisma.messages.update({
      where: { id: messageId },
      data: {
        status: "Read",
      },
    });

    const senderSocketId = onlineUsers[message?.senderId];

    io.to(String(senderSocketId)).emit("status:Read", {
      messageId,
      conversationId,
    });
  });

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
  socket.on(
    "clearChat",
    async ({ senderId, receiverId, type, groupId, sidebarChatId }) => {
      let clearChat = null;
      if (type === "chat") {
        const isClearChatOfUserExist = await prisma.chatClear.findUnique({
          where: {
            userId_chatPartnerUserId: {
              userId: Number(senderId),
              chatPartnerUserId: Number(receiverId),
            },
          },
        });
        if (isClearChatOfUserExist) {
          clearChat = await prisma.chatClear.update({
            where: {
              userId_chatPartnerUserId: {
                userId: Number(senderId),
                chatPartnerUserId: Number(receiverId),
              },
            },
            data: {
              deletedAt: new Date(),
            },
          });
        } else {
          clearChat = await prisma.chatClear.create({
            data: {
              userId: senderId,
              chatPartnerUserId: receiverId,
            },
          });
        }
        // const clearChatAllMessages = await prisma.messages.updateMany({
        //   where: {
        //     OR: [
        //       { senderId: Number(senderId), receiverId: Number(receiverId) },
        //       { senderId: Number(receiverId), receiverId: Number(senderId) },
        //     ],
        //   },
        //   data: {
        //     deletedByMeId: Number(senderId),
        //   },
        // });
        socket.emit("sidebar:update", {
          lastMessage: "",
          sidebarChatId: sidebarChatId,
          type: "chat",
          lastMessageId: null,
          lastMessageCreatedAt: null,
          deleteType: "For_Me",
          status: null,
        });
      } else {
        const isClearChatOfUserExist = await prisma.chatClear.findUnique({
          where: {
            userId_groupId: {
              userId: Number(senderId),
              groupId: Number(groupId),
            },
          },
        });
        if (isClearChatOfUserExist) {
          clearChat = await prisma.chatClear.update({
            where: {
              userId_groupId: {
                userId: Number(senderId),
                groupId: Number(groupId),
              },
            },
            data: {
              deletedAt: new Date(),
            },
          });
        } else {
          clearChat = await prisma.chatClear.create({
            data: {
              userId: Number(senderId),
              groupId: Number(groupId),
            },
          });
        }

        socket.emit("sidebar:update", {
          lastMessage: "",
          sidebarChatId: sidebarChatId,
          type: "group",
          lastMessageId: null,
          lastMessageCreatedAt: null,
          deleteType: "For_Me",
          status: null,
        });
      }

      const senderSocketId = onlineUsers[senderId];
      io.to(String(senderSocketId)).emit("clearChat", {
        clearChat,
        type: type,
      });
    },
  );
  socket.on(
    "memeberLastMsgSeenUpdate",
    async ({ messageSenderId, lastMessageId, memberId, groupId }) => {
      await prisma.groupMembers.update({
        where: {
          userId_groupId: {
            userId: memberId,
            groupId: groupId,
          },
        },
        data: {
          lastSeenMessageId: lastMessageId,
        },
      });
      const memeber = await prisma.groupMembers.findMany({
        where: {
          groupId: groupId,
        },
        select: {
          // userId: true,
          lastSeenMessageId: true,
          user: {
            select: {
              name: true,
              id: true,
              image: true,
            },
          },
        },
      });
      io.to(String(onlineUsers[messageSenderId])).emit("groupMsgSeen", {
        lastMessageId,
        memebers: memeber,
      });
    },
  );
  socket.on("groupMsgSeen", async ({ groupId, messageSenderUserId }) => {
    const memeber = await prisma.groupMembers.findMany({
      where: {
        groupId: groupId,
      },
      select: {
        lastSeenMessageId: true,
        user: {
          select: {
            name: true,
            id: true,
            image: true,
          },
        },
      },
    });
    io.to(String(onlineUsers[messageSenderUserId])).emit("groupMsgSeen", {
      memebers: memeber,
    });
  });
  socket.on("disconnect", async () => {
    const userId = socket.data.userId;
    if (!userId) return;
    console.log("socket disconnected:", socket.id);
    const disconnectedUserId = Object.keys(onlineUsers).find(
      (id) => onlineUsers[id] === socket.id,
    );
    if (disconnectedUserId) {
      delete onlineUsers[disconnectedUserId];
      delete userChatId[disconnectedUserId];

      const userUpadted = await prisma.user.update({
        where: { id: Number(userId) },
        data: {
          LastActiveAt: new Date(),
        },
      });
      // console.log(userChatId);
      io.emit("user-disconnected", disconnectedUserId);
    }
  });
});
server.listen(PORT, () => {
  console.log(`server is listen on port ${PORT}`);
});
app.use(router);
app.get("/", (req, res) => {
  return res.send(`server is running successfully on port ${PORT}`);
});
