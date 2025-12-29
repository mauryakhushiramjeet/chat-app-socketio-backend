import { prisma } from "../lib/prisma";
import type { Request, Response } from "express";

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
    });

    return res
      .status(200)
      .json({ success: true, message: "message get successfully", messages });
  } catch (error) {
    console.log(error);
  }
};
export const addMessage = async (req: Request, res: Response) => {
  const { senderId, receiverId, text } = req.body;
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
      },
    });
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
