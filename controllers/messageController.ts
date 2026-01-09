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

    const messages = await prisma.messages.findMany({
      where: {
        OR: [
          { senderId: Number(senderId), receiverId: Number(receiverId) },
          { senderId: Number(receiverId), receiverId: Number(senderId) },
        ],
      },
      orderBy: {
        createdAt: "asc",
      },
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
export const addMessage = async (req: Request, res: Response) => {
  const { senderId, receiverId, text } = req.body;
  // console.log("text gated in api", text);
  try {
    if (!senderId || !receiverId) {
      return res.status(400).json({
        success: false,
        message: "senderId and receiverId are required",
      });
    }
    if (!text) {
      return res.status(400).json({
        success: false,
        message: "Message is required",
      });
    }
    const validateUsers = await prisma.user.findMany({
      where: {
        id: {
          in: [receiverId, senderId],
        },
      },
    });
    if (validateUsers.length !== 2) {
      return res.status(400).json({
        success: false,
        message: "Sender or Receiver does not exist",
      });
    }
    const messages = await prisma.messages.create({
      data: {
        text: text,
        senderId,
        receiverId,
        status: "Send",
      },
    });
    // console.log(messages);

    return res.status(201).json({
      success: true,
      message: "message sended successfully",
      messages,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error });
  }
};

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
    const messages = await prisma.groupMessage.findMany({
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
        // group: {
        //   include: {
        //     groupMembers: {
        //       include: {
        //         user: {
        //           select: {
        //             id: true,
        //             name: true,
        //             image: true,
        //           },
        //         },
        //       },
        //     },
        //   },
        // },
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
  const { clientMessageId, text, senderId, receiverId, type } = req.body;
  try {
    if (!senderId || !receiverId) {
      return res.status(400).json({
        success: false,
        message: "senderId and receiverId are required",
      });
    }
    if (!text) {
      return res.status(400).json({
        success: false,
        message: "Message is required",
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
    const message = await prisma.messages.create({
      data: {
        text: text,
        senderId: senderId,
        receiverId: receiverId,
        status: "Send",
      },
    });
    const response = message;
    if (!files || files?.length == 0) return;
    const createdFile = await Promise.all(
      files.map((file) =>
        prisma.file.create({
          data: {
            messageId: message?.id,
            fileName: file.originalname,
            filePath: file.path,
            fileType: file.mimetype,
          },
        })
      )
    );

    io.to(String(onlineUsers[senderId])).emit("status:send", {
      clientMessageId,
    });
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
      files: createdFile,
      type,
    });

    io.to(String(receiverSocketId)).emit("newMessage", {
      clientMessageId,
      response,
      lastMessageId: response?.id,
      conversationId: receiverConversation,
      targetChatUserId: senderId,
      files: createdFile,
      type,
    });
    return res.status(201).json({
      success: true,
      message: "message sended successfully",
      messages: message,
      files: createdFile,
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
