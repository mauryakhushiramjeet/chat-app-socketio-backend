import { prisma } from "../lib/prisma";
import type { Request, Response } from "express";
import { io, onlineUsers } from "../server";
export const createGroup = async (req: Request, res: Response) => {
  const { groupName, selectedMembers, groupCreatedUserId } = req.body;
  console.log(selectedMembers);
  const image = req.file;
  try {
    if (!groupName?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Group name is required",
      });
    }
    let selectedMembersRow;
    if (!Array.isArray(selectedMembers)) {
      selectedMembersRow = [selectedMembers];
      console.log("array is crete")
    }

    selectedMembersRow = selectedMembers.map(Number);
    console.log(selectedMembersRow);
    if (selectedMembersRow.length < 2) {
      return res.status(400).json({
        success: false,
        message: "Please select at least 2 members",
      });
    }

    if (!groupCreatedUserId) {
      return res.status(400).json({
        success: false,
        message: "Group creator is missing",
      });
    }
    const members = await prisma.user.findMany({
      where: {
        id: {
          in: selectedMembersRow,
        },
      },
      select: {
        id: true,
        name: true,
      },
    });
    console.log(members);
    const group = await prisma.group.create({
      data: {
        name: groupName,
        image: image ? image.path : null,
      },
    });
    const groupMembers = [];

    for (const memberId of selectedMembersRow) {
      const gm = await prisma.groupMembers.create({
        data: {
          groupId: group.id,
          userId: memberId,
          admin: groupCreatedUserId === memberId,
        },
      });
      groupMembers.push(gm);
    }

    selectedMembers.forEach((userId: any) => {
      const socketId = onlineUsers[userId];
      if (socketId) {
        io.to(socketId).emit("groupCreate", {
          group,
          members,
        });
      }
    });

    return res.status(201).json({
      success: true,
      message: "Group created successfully",
      group,
      groupMembers,
    });
  } catch (error) {
    const userSocketId = onlineUsers[groupCreatedUserId];
    io.to(String(userSocketId)).emit("groupCreate:error", {
      error,
    });
    return res.status(500).json({ success: false, message: error });
  }
};
