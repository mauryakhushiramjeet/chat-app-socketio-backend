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
    const messages = await prisma.messages.findMany({
      where: {
        OR: [
          { senderId: Number(loggedInUserId) },
          { receiverId: Number(loggedInUserId) },
        ],
      },
    });
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

    const updatedConversation = conversations.map((chatConversation) => {
      const lastMessage = messages.find(
        (msg) => msg.id === chatConversation.lastMessageId
      );
      // console.log(lastMessage, "last deleted message");
      if (lastMessage?.deletedByMeId === Number(loggedInUserId)) {
        const chatMessages = messages
          .filter(
            (msg) =>
              (msg.senderId === chatConversation.currentUserId &&
                msg.receiverId === chatConversation.chatUserId) ||
              (msg.senderId === chatConversation.chatUserId &&
                msg.receiverId === chatConversation.currentUserId)
          )
          .filter((msg) => msg.deletedByMeId !== Number(loggedInUserId))
          .sort(
            (a, b) =>
              new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
        console.log("chat message is here", chatMessages, "this");
        const newLastMessage = chatMessages.length
          ? chatMessages[chatMessages.length - 1]
          : null;
        console.log(newLastMessage, "ne last message slist");
        return {
          ...chatConversation,
          lastMessage: newLastMessage
            ? newLastMessage.text
            : "This message was deleted",
          lastMessageId: newLastMessage ? newLastMessage.id : null,
        };
      }
      return chatConversation;
    });

    console.log("conversation chat ", updatedConversation);
    const formatedChatConversation = updatedConversation.map((conversation) => {
      const isLoggedUserIschatUser =
        conversation.chatUser?.id === Number(loggedInUserId);
      return {
        id: conversation?.id,
        type: "chat",
        lastMessage: conversation?.lastMessage,
        lastMessageCreatedAt: conversation?.lastMessageCreatedAt,
        lastMessageId: conversation.lastMessageId,
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
    return res.status(200).json({
      success: true,
      message: "get all the all sidebar conversation successfully",
      sidebarchatsAndGroupConverstions,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error });
  }
};
