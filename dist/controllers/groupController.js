import { prisma } from "../lib/prisma.js";
import { io, onlineUsers } from "../server.js";
export const createGroup = async (req, res) => {
    const { groupName, selectedMembers, groupCreatedUserId } = req.body;
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
        }
        selectedMembersRow = selectedMembers.map(Number);
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
        selectedMembers.forEach((userId) => {
            const socketId = onlineUsers[userId];
            if (socketId) {
                io.to(socketId).emit("groupCreate", {
                    id: group?.id,
                    name: group?.name,
                    image: group?.image,
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
    }
    catch (error) {
        const userSocketId = onlineUsers[groupCreatedUserId];
        io.to(String(userSocketId)).emit("groupCreate:error", {
            error,
        });
        return res.status(500).json({ success: false, message: error });
    }
};
export const updatelastMessageId = async (req, res) => {
    const { groupId, lastMessageId, userId } = req.body;
    try {
        await prisma.groupMembers.update({
            where: {
                userId_groupId: {
                    userId: Number(userId),
                    groupId: Number(groupId),
                },
            },
            data: {
                lastSeenMessageId: Number(lastMessageId),
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
        const memebers = await prisma.groupMembers.findMany({
            where: {
                groupId: Number(groupId),
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
        return res.json({ success: true, memebers });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: error });
    }
};
