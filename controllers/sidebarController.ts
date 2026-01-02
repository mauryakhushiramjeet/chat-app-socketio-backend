import { group } from "node:console";
import { prisma } from "../lib/prisma";
import type { Request, Response } from "express";
export const sidebarChatList = async (req: Request, res: Response) => {
  const { loggedInUserId } = req.query;
  console.log("in srver", loggedInUserId);
  try {
    if (!loggedInUserId) {
      return res.status(400).json({
        success: false,
        message: "LoggedIn user id is required.",
      });
    }
    const conversations = await prisma.chatConversation.findMany({
      where: {
        OR: [
          { currentUserId: Number(loggedInUserId) },
          { chatUserId: Number(loggedInUserId) },
        ],
      },
      include: {
        chatUser: true,
        currentUser: true,
      },
      orderBy: {
        lastMessage: "desc",
      },
    });

    const formatedChatConversation = conversations.map((conversation) => {
      const isLoggedUserIschatUser =
        conversation.chatUser?.id === Number(loggedInUserId);
      return {
        id: conversation?.id,
        type: "chat",
        lastMessage: conversation?.lastMessage,
        lastMessageCreatedAt: conversation?.lastMessageCreatedAt,
        chatUser: isLoggedUserIschatUser
          ? {
              id: conversation.currentUser?.id,
              name: conversation.currentUser?.name,
              image: conversation.currentUser?.image,
              LastActiveAt: conversation.currentUser?.LastActiveAt,
            }
          : {
              id: conversation.chatUser?.id,
              name: conversation.chatUser?.name,
              image: conversation.chatUser?.image,
              LastActiveAt: conversation.chatUser?.LastActiveAt,
            },
      };
    });

    const groupConversation = await prisma.group.findMany({
      where: {
        groupMembers: {
          some: {
            userId: Number(loggedInUserId),
          },
        },
      },
      include: {
        messages: {
          select: {
            text: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
        },
      },
    });
    const formatedGroupConversation = groupConversation.map((group) => {
      const lastMessage = group?.messages[0]?.text ?? "";
      const lastMessageCreatedAt = group?.messages[0]?.createdAt ?? null;

      return {
        id: group.id,
        name: group.name,
        type: "group",
        groupImage: group?.image ?? null,
        lastMessage,
        lastMessageCreatedAt,
      };
    });
    const sidebarchatsAndGroupConverstions = [
      ...formatedChatConversation,
      ...formatedGroupConversation,
    ];
    console.log("jhkljhkjhkjh", formatedGroupConversation);
    return res.status(200).json({
      success: true,
      message: "get all the all sidebar conversation successfully",
      sidebarchatsAndGroupConverstions,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error });
  }
};
