import { prisma } from "../lib/prisma";
import type { Request, Response } from "express";
export const sidebarChatList = async (req: Request, res: Response) => {
  const { loggedInUserId } = req.query;
  // console.log("in srver", loggedInUserId);
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
    const clearChats = await prisma.chatClear.findMany({
      where: {
        userId: Number(loggedInUserId),
        chatPartnerUserId: { not: null },
      },
    });
    const updatedConversation = conversations.map((chatConversation) => {
      const lastMessage = messages.find(
        (msg) => msg.id === chatConversation.lastMessageId,
      );
      const chatPartnerId =
        Number(chatConversation?.chatUserId) === Number(loggedInUserId)
          ? chatConversation?.currentUserId
          : chatConversation?.chatUserId;
      const clearChat = clearChats.find(
        (cc) =>
          cc.userId === Number(loggedInUserId) &&
          cc.chatPartnerUserId === chatPartnerId,
      );
      if (
        lastMessage &&
        clearChat &&
        lastMessage?.createdAt <= clearChat?.deletedAt
      ) {
        return {
          ...chatConversation,
          lastMessage: "",
          lastMessageId: null,
          lastMessageCreatedAt: null,
          status: null,
          messageSenderId:null
        };
      }
      if (lastMessage?.deletedByMeId === Number(loggedInUserId)) {
        const chatMessages = messages
          .filter(
            (msg) =>
              (msg.senderId === chatConversation.currentUserId &&
                msg.receiverId === chatConversation.chatUserId) ||
              (msg.senderId === chatConversation.chatUserId &&
                msg.receiverId === chatConversation.currentUserId),
          )
          .filter((msg) => msg.deletedByMeId !== Number(loggedInUserId))
          .sort(
            (a, b) =>
              new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
          );
        // console.log("chat message is here", chatMessages, "this");
        const newLastMessage = chatMessages.length
          ? chatMessages[chatMessages.length - 1]
          : null;
        return {
          ...chatConversation,
          lastMessage: newLastMessage ? newLastMessage?.text : "",
          lastMessageId: newLastMessage ? newLastMessage.id : null,
          status: newLastMessage ? newLastMessage?.status : null,
          messageSenderId:newLastMessage?newLastMessage?.senderId:null
        };
      }
      if (lastMessage?.deletedForAll === true) {
        return {
          ...chatConversation,
          lastMessage: "This message was deleted",
          lastMessageId: null,
          status: lastMessage?.status,
          messageSenderId:lastMessage?lastMessage?.senderId:null
        };
      }
      return { ...chatConversation, status: lastMessage?.status,messageSenderId:lastMessage?.senderId};
    });
    // console.log("status", updatedConversation);
    const formatedChatConversation = updatedConversation.map((conversation) => {
      const isLoggedUserIschatUser =
        conversation.chatUser?.id === Number(loggedInUserId);
      return {
        id: conversation?.id,
        type: "chat",
        lastMessage: conversation?.lastMessage,
        lastMessageCreatedAt: conversation?.lastMessageCreatedAt,
        lastMessageId: conversation.lastMessageId,
        status: conversation.status,
        messageSenderId:conversation?.messageSenderId,
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
            id: true,
            text: true,
            createdAt: true,
            deletedByMeId: true,
            deletedForAll: true,
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });
    const clearChat = await prisma.chatClear.findMany({
      where: {
        userId: Number(loggedInUserId),
        groupId: { not: null },
      },
    });
    const formatedGroupConversation = groupConversation.map((group) => {
      const messages = group.messages;
      const lastMessage = messages[0];
      const isClearChat = clearChat.find(
        (cc) => Number(cc.groupId) === Number(group?.id),
      );
      if (
        isClearChat &&
        lastMessage &&
        lastMessage?.createdAt <= isClearChat?.deletedAt
      ) {
        return {
          id: group.id,
          name: group.name,
          type: "group",
          groupImage: group.image ?? null,
          lastMessage: "",
          lastMessageId: null,
          lastMessageCreatedAt: null,
        };
      }

      if (lastMessage?.deletedForAll) {
        return {
          id: group.id,
          name: group.name,
          type: "group",
          groupImage: group.image ?? null,
          lastMessage: "This message was deleted",
          lastMessageId: null,
          lastMessageCreatedAt: lastMessage.createdAt ?? null,
        };
      }

      // Case 2: Deleted only for me
      if (lastMessage?.deletedByMeId === Number(loggedInUserId)) {
        const previousMessage = messages
          .filter((msg) => msg.deletedByMeId !== Number(loggedInUserId))
          .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
          .at(-1);
        return {
          id: group.id,
          name: group.name,
          type: "group",
          groupImage: group.image ?? null,
          lastMessage: previousMessage
            ? previousMessage.text
              ? previousMessage.text
              : "This message was deleted"
            : "Start conversation",
          lastMessageId: previousMessage?.id ?? null,
          lastMessageCreatedAt: previousMessage?.createdAt ?? null,
        };
      }

      // Case 3: Normal message
      return {
        id: group.id,
        name: group.name,
        type: "group",
        groupImage: group.image ?? null,
        lastMessage: lastMessage?.text ?? "Start conversation",
        lastMessageId: lastMessage?.id ?? null,
        lastMessageCreatedAt: lastMessage?.createdAt ?? null,
      };
    });

    // console.log(formatedGroupConversation, "group");
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
