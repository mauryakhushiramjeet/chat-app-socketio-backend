import { prisma } from "../lib/prisma";
import type { Request, Response } from "express";
import { io, onlineUsers } from "../server";

export const getMessages = async (req: Request, res: Response) => {
  const { senderId, receiverId } = req.query; // <-- use query
  console.log(senderId, receiverId, "in api");
  try {
    if (!senderId || !receiverId) {
      return res.status(400).json({
        success: false,

        message: "Sender and reciever Id is required",
      });
    }

    const message = await prisma.messages.findMany({
      where: {
        OR: [
          { senderId: Number(senderId), receiverId: Number(receiverId) },
          { senderId: Number(receiverId), receiverId: Number(senderId) },
        ],
      },
      include: {
        file: {
          where: { isDeleted: false },
          select: {
            fileName: true,
            filePath: true,
            fileType: true,
            id: true,
            isDeleted: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    const messages = message.map((msg) => {
      if (msg?.replyToMessageId) {
        const replyMessages = message.find(
          (message) => message?.id === msg?.replyToMessageId,
        );
        return {
          ...msg,
          replyMessage: {
            text: replyMessages?.text,
            file:
              replyMessages?.file && replyMessages?.file?.length > 0
                ? replyMessages?.file
                : null,
            createdAt: replyMessages?.createdAt,
            id: replyMessages?.id,
            replyMessageSenderId: replyMessages?.replyMessageSenderId,
          },
        };
      } else {
        return msg;
      }
    });
    return res
      .status(200)
      .json({ success: true, message: "message get successfully", messages });
  } catch (error) {
    return res.status(500).json({ success: false, message: error });
  }
};
export const getAllMyMessages = async (req: Request, res: Response) => {
  const { receiverId } = req.query;
  // console.log(receiverId,"reciver id is here");
  try {
    if (!receiverId) return;
    const messages = await prisma.messages.findMany({
      where: { receiverId: Number(receiverId), status: "Send" },
      include: {
        file: {
          select: {
            filePath: true,
            fileName: true,
            fileType: true,
            id: true,
          },
        },
      },
    });
    if (messages.length === 0) {
      return res.status(200).json({
        success: false,
        message: "For this receiver no message is created yet",
      });
    }
    return res.status(200).json({
      success: true,
      message: "All messages is fetched successfully",
      messages,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error });
  }
};
// export const addMessage = async (req: Request, res: Response) => {
//   const { senderId, receiverId, text } = req.body;
//   // console.log("text gated in api", text);
//   try {
//     if (!senderId || !receiverId) {
//       return res.status(400).json({
//         success: false,
//         message: "senderId and receiverId are required",
//       });
//     }
//     if (!text) {
//       return res.status(400).json({
//         success: false,
//         message: "Message is required",
//       });
//     }
//     const validateUsers = await prisma.user.findMany({
//       where: {
//         id: {
//           in: [receiverId, senderId],
//         },
//       },
//     });
//     if (validateUsers.length !== 2) {
//       return res.status(400).json({
//         success: false,
//         message: "Sender or Receiver does not exist",
//       });
//     }
//     const messages = await prisma.messages.create({
//       data: {
//         text: text,
//         senderId,
//         receiverId,
//         status: "Send",
//       },
//     });
//     // console.log(messages);

//     return res.status(201).json({
//       success: true,
//       message: "message sended successfully",
//       messages,
//     });
//   } catch (error) {
//     return res.status(500).json({ success: false, message: error });
//   }
// };

// export const deleteMessageForMe = async (req: Request, res: Response) => {
//   const { messageId, senderId } = req.body;
//   try {
//     if (!messageId || !senderId) {
//       return res.status(400).json({
//         success: false,
//         message: "messageId and senderId are required",
//       });
//     }
//     const message = await prisma.messages.findUnique({
//       where: { id: messageId },
//     });
//     if (!message) {
//       return res
//         .status(400)
//         .json({ success: false, message: "message not found" });
//     }
//     if (message.deletedByMeId === senderId) {
//       return res.status(409).json({
//         success: false,
//         message: "Message already deleted for you.",
//       });
//     }
//     if (message.senderId !== senderId) {
//       return res.status(400).json({
//         success: false,
//         message: "You are not authorized to delete this message.",
//       });
//     }
//     await prisma.messages.update({
//       where: { id: messageId },
//       data: {
//         deletedByMeId: senderId,
//       },
//     });
//     return res.status(200).json({
//       success: true,
//       message: "Message deleted for you successfully.",
//     });
//   } catch (error) {
//     return res.status(500).json({ success: false, message: error });
//   }
// };
// export const deleteMsgForEverone = async (req: Request, res: Response) => {
//   const { messageId, senderId } = req.body;
//   try {
//     if (!messageId || !senderId) {
//       return res.status(400).json({
//         success: false,
//         message: "messageId and senderId are required",
//       });
//     }
//     const message = await prisma.messages.findUnique({
//       where: { id: messageId },
//     });
//     if (!message) {
//       return res
//         .status(400)
//         .json({ success: false, message: "message not found" });
//     }
//     if (message.deletedByMeId === senderId) {
//       return res.status(409).json({
//         success: false,
//         message: "Message already deleted.",
//       });
//     }
//     if (message.senderId !== senderId) {
//       return res.status(400).json({
//         success: false,
//         message: "You are not authorized to delete this message.",
//       });
//     }
//     await prisma.messages.update({
//       where: { id: messageId },
//       data: {
//         deletedForAll: true,
//         deletedByMeId: senderId,
//       },
//     });
//     return res.status(200).json({
//       success: true,
//       message: "Message deleted for evryone successfully.",
//     });
//   } catch (error) {
//     return res.status(500).json({ success: false, message: error });
//   }
// };
export const getGroupMessages = async (req: Request, res: Response) => {
  const { groupId } = req.query;
  if (!groupId) {
    return res.status(400).json({
      success: false,
      message: "Group ID is required",
    });
  }

  try {
    // Fetch messages with sender info
    const groupMessagesWithReplies = await prisma.groupMessage.findMany({
      where: {
        groupId: Number(groupId),
      },
      orderBy: {
        createdAt: "asc",
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        file: {
          where: { isDeleted: false },
          select: {
            fileName: true,
            filePath: true,
            fileType: true,
            id: true,
            isDeleted: true,
          },
        },
      },
    });
    const memebers = await prisma.group.findUnique({
      where: {
        id: Number(groupId),
      },
      select: {
        groupMembers: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
          },
        },
      },
    });

    const messages = groupMessagesWithReplies.map((groupMsg) => {
      const replyMessages = groupMessagesWithReplies.find(
        (message) => message?.id === groupMsg?.replyToMessageId,
      );
      if (groupMsg?.replyToMessageId) {
        return {
          ...groupMsg,
          replyMessage: {
            text: replyMessages?.text,
            file:
              replyMessages?.file && replyMessages?.file?.length > 0
                ? replyMessages?.file
                : null,
            createdAt: replyMessages?.createdAt,
            id: replyMessages?.id,
            replyMessageSenderId: replyMessages?.replyMessageSenderId,
          },
        };
      } else {
        return groupMsg;
      }
    });

    const users = memebers?.groupMembers.map((memebers) => memebers.user);
    // console.log(users);
    return res.status(200).json({
      success: true,
      message: "Messages fetched successfully",
      messages,
      users,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong",
      error,
    });
  }
};

export const sendMessage = async (req: Request, res: Response) => {
  const files = req.files as Express.Multer.File[];
  const {
    clientMessageId,
    text,
    senderId,
    receiverId,
    type,
    replyToMessageId,
    replyMessageSenderId,
  } = req.body;
  try {
    console.log(clientMessageId, text, senderId, receiverId, type, "fghfg");
    if (!senderId || !receiverId) {
      return res.status(400).json({
        success: false,
        message: "senderId and receiverId are required",
      });
    }
    if (!text && files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "message or file is required.",
      });
    }
    const validateUsers = await prisma.user.findMany({
      where: {
        id: {
          in: [Number(receiverId), Number(senderId)],
        },
      },
    });
    if (validateUsers.length !== 2) {
      return res.status(400).json({
        success: false,
        message: "Sender or Receiver does not exist",
      });
    }
    let replyMessage = null;

    const replyId = Number(replyToMessageId);

    if (Number.isFinite(replyId)) {
      replyMessage = await prisma.messages.findUnique({
        where: {
          id: replyId,
        },
        include: {
          file: {
            select: {
              fileName: true,
            },
          },
        },
      });
    }

    const message = await prisma.messages.create({
      data: {
        text: text,
        senderId: Number(senderId),
        receiverId: Number(receiverId),
        status: "Send",
        replyMessageSenderId: Number(replyMessageSenderId),
        replyToMessageId: replyToMessageId ? Number(replyToMessageId) : null,
      },
    });
    const response = message;
    let reponseFiles = null;
    if (files || files?.length > 0) {
      const createdFile = await Promise.all(
        files.map((file) =>
          prisma.file.create({
            data: {
              messageId: message?.id,
              fileName: file.originalname,
              filePath: file.path,
              fileType: file.mimetype,
            },
          }),
        ),
      );
      reponseFiles = createdFile;
    }

    io.to(String(onlineUsers[senderId])).emit("status:send", {
      clientMessageId,
    });
    let conversationId = null;
    const conversation = await prisma.chatConversation.findFirst({
      where: {
        OR: [
          { chatUserId: Number(receiverId), currentUserId: Number(senderId) },
          { chatUserId: Number(senderId), currentUserId: Number(receiverId) },
        ],
      },
      include: {
        chatUser: true,
      },
    });

    if (conversation) {
      await prisma.chatConversation.update({
        where: { id: Number(conversation?.id) },
        data: {
          lastMessage: text.trim() !== "" ? text : "Send a file",
          lastMessageCreatedAt: new Date(),
          lastMessageId: response?.id,
        },
      });
      conversationId = conversation;
    }
    if (!conversation) {
      const createdConversation = await prisma.chatConversation.create({
        data: {
          currentUserId: Number(senderId),
          chatUserId: Number(receiverId),
          lastMessage: text.trim() !== "" ? text : "Send a file",
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
    console.log("replyed message is", replyMessage);
    io.to(String(senderSocketId)).emit("newMessage", {
      clientMessageId,
      response,
      lastMessageId: response?.id,
      conversationId: senderConversation,
      targetChatUserId: receiverId,
      files: reponseFiles,
      type,
      replyMessage: {
        text: replyMessage?.text,
        file:
          replyMessage?.file && replyMessage?.file?.length > 0
            ? replyMessage?.file
            : null,
        createdAt: replyMessage?.createdAt,
        replyMessageSenderId: replyMessage?.replyMessageSenderId,
        id: replyMessage?.id,
      },
    });
    console.log({
      clientMessageId,
      response,
      lastMessageId: response?.id,
      conversationId: senderConversation,
      targetChatUserId: receiverId,
      files: reponseFiles,
      type,
      replyMessage: {
        text: replyMessage?.text,
        file:
          replyMessage?.file && replyMessage?.file?.length > 0
            ? replyMessage?.file
            : null,
        createdAt: replyMessage?.createdAt,
        id: replyMessage?.id,
        replyMessageSenderId: replyMessage?.replyMessageSenderId,
      },
    });
    io.to(String(receiverSocketId)).emit("newMessage", {
      clientMessageId,
      response,
      lastMessageId: response?.id,
      conversationId: receiverConversation,
      targetChatUserId: senderId,
      files: reponseFiles,
      type,
      replyMessage: {
        text: replyMessage?.text,
        file:
          replyMessage?.file && replyMessage?.file?.length > 0
            ? replyMessage?.file
            : null,
        createdAt: replyMessage?.createdAt,
        id: replyMessage?.id,
        replyMessageSenderId: replyMessage?.replyMessageSenderId,
      },
    });
    return res.status(201).json({
      success: true,
      message: "message sended successfully",
      messages: message,
      files: reponseFiles,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong",
      error,
    });
  }
};
export const sendGroupMessage = async (req: Request, res: Response) => {
  const files = req.files as Express.Multer.File[];
  const {
    groupId,
    message,
    messageSenderId,
    replyToMessageId,
    replyMessageSenderId,
  } = req.body;
  try {
    if (message.trim() === "" && files?.length === 0) {
      return res.status(400).json({
        success: false,
        message: "senderId and receiverId are required",
      });
    }
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
      return res.status(400).json({
        success: false,
        message: "This group is not available",
      });
    }
    const isMember = group.groupMembers.some(
      (user) => String(user.userId) === String(messageSenderId),
    );
    if (!isMember) {
      return res.status(400).json({
        success: false,
        message: "Only group joined user can send data",
      });
    }
    let replyMessage = null;

    const replyId = Number(replyToMessageId);

    if (Number.isFinite(replyId)) {
      replyMessage = await prisma.groupMessage.findUnique({
        where: {
          id: replyId,
        },
        include: {
          file: {
            select: {
              fileName: true,
            },
          },
        },
      });
    }
    const createMessage = await prisma.groupMessage.create({
      data: {
        text: message,
        createdAt: new Date(),
        groupId: Number(groupId),
        userId: Number(messageSenderId),
        replyToMessageId: Number(replyToMessageId),
        replyMessageSenderId: Number(replyMessageSenderId),
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
    let reponseFiles = null;
    if (files || files?.length > 0) {
      const createdFile = await Promise.all(
        files.map((file) =>
          prisma.file.create({
            data: {
              groupMessageId: createMessage?.id,
              fileName: file.originalname,
              filePath: file.path,
              fileType: file.mimetype,
            },
          }),
        ),
      );
      reponseFiles = createdFile;
    }
    group.groupMembers.map((user) => {
      const socketId = onlineUsers[user?.userId];
      io.to(String(socketId)).emit("receiveGropMessage", {
        groupId: `group-${groupId}`,
        message,
        lastMessageId: createMessage?.id,
        sender: createMessage?.sender,
        file: reponseFiles,
        replyMessage: {
          text: replyMessage?.text,
          file:
            replyMessage?.file && replyMessage?.file?.length > 0
              ? replyMessage?.file
              : null,
          createdAt: replyMessage?.createdAt,
          id: replyMessage?.id,
          replyMessageSenderId: replyMessage?.replyMessageSenderId,
        },
      });
    });
    return res.status(201).json({
      success: true,
      message: "message sended successfully",
      messages: createMessage,
      files: reponseFiles,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong",
      ERROR: error.message,
    });
  }
};
export const editMessageFile = async (req: Request, res: Response) => {
  const {
    messageId,
    senderId,
    newText,
    receiverId,
    type,
    deletedFileId,
    groupId,
  } = req.body;
  const files = req?.files as Express.Multer.File[];
  try {
    console.log(
      messageId,
      senderId,
      newText,
      receiverId,
      type,
      deletedFileId,
      groupId,
      "new text",
    );
    if (!messageId || !senderId) {
      throw new Error("Required data missing");
    }
    if (!newText && files.length == 0) {
      throw new Error("Required data missing");
    }
    if (type === "chat") {
      const message = await prisma.messages.findUnique({
        where: { id: Number(messageId) },
      });

      if (!message) {
        throw new Error("Message not found");
      }
      console.log(message);
      if (Number(message.senderId) !== Number(senderId)) {
        throw new Error("Unauthorized edit");
      }

      const updatedMessage = await prisma.messages.update({
        where: { id: Number(messageId) },
        data: { text: newText },
      });
      const deletedFiles = (
        Array.isArray(deletedFileId) ? deletedFileId : [deletedFileId]
      )
        .map((id) => Number(id))
        .filter((id) => !isNaN(id) && id > 0);

      console.log(deletedFiles, "final deleted ids");

      if (deletedFiles.length > 0) {
        await Promise.all(
          deletedFiles.map((id) =>
            prisma.file.update({
              where: { id },
              data: { isDeleted: true },
            }),
          ),
        );
      }

      let createFiles = null;
      if (Array.isArray(files) && files.length > 0) {
        console.log("run in deleted", deletedFileId);
        createFiles = await Promise.all(
          files?.map(
            async (f) =>
              await prisma.file.create({
                data: {
                  fileName: f.originalname,
                  filePath: f.path,
                  fileType: f.mimetype,
                  messageId: Number(messageId),
                },
              }),
          ),
        );
      }

      // Then fetch files AFTER deletion is guaranteed
      const allFile = await prisma.file.findMany({
        where: { messageId: Number(messageId), isDeleted: false },
        select: {
          id: true,
          fileName: true,
          filePath: true,
          fileType: true,
          messageId: true,
          isDeleted: true,
        },
      });

      const roomId =
        senderId < receiverId
          ? `${senderId}-${receiverId}`
          : `${receiverId}-${senderId}`;

      // const imagefile = allFile?.map((f) => f.isDeleted !== true);
      console.log(allFile, "all files");
      io.to(roomId).emit("editMessage", {
        messageId,
        newText,
        files: allFile,
        chatType: "chat",
      });
    }

    if (type === "group") {
      const message = await prisma.groupMessage.findUnique({
        where: { id: Number(messageId) },
      });

      if (!message) {
        throw new Error("Message not found");
      }

      if (Number(message?.userId) !== Number(senderId)) {
        throw new Error("Unauthorized edit");
      }
      console.log("files", files);
      const groupMessage = await prisma.groupMessage.findUnique({
        where: { id: Number(messageId) },
      });
      let createGroupFile = null;
      console.log("group message sis", groupMessage);
      if (files && files?.length !== 0) {
        createGroupFile = await Promise.all(
          files?.map(
            async (f) =>
              await prisma.file.create({
                data: {
                  fileName: f.originalname,
                  filePath: f.path,
                  fileType: f.mimetype,
                  groupMessageId: Number(messageId),
                },
              }),
          ),
        );
      }
      console.log(createGroupFile, "created ");
      const deletedFiles = (
        Array.isArray(deletedFileId) ? deletedFileId : [deletedFileId]
      )
        .map((id) => Number(id))
        .filter((id) => !isNaN(id) && id > 0);

      console.log(deletedFiles, "final deleted ids");

      if (deletedFiles.length > 0) {
        await Promise.all(
          deletedFiles.map((id) =>
            prisma.file.update({
              where: { id },
              data: { isDeleted: true },
            }),
          ),
        );
      }

      const groupChat = await prisma.groupMessage.update({
        where: { id: Number(messageId) },
        data: {
          text: newText,
        },

        include: {
          file: {
            where: {
              isDeleted: false,
            },
            select: {
              fileName: true,
              filePath: true,
              fileType: true,
              messageId: true,
            },
          },

          group: {
            select: {
              groupMembers: true,
            },
          },
        },
      });

      groupChat.group.groupMembers.forEach((user: any) => {
        console.log("run");
        const socketId = onlineUsers[user.userId];
        if (socketId) {
          io.to(socketId).emit("editMessage", {
            messageId,
            newText,
            files: groupChat?.file,
            chatType: "group",
          });
        }
      });
    }

    res.status(200).json({ success: true });
  } catch (error: any) {
    // io.to(senderId).emit("message:error", {
    //   message: error.message || "Something went wrong while editing message",
    // });

    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};
