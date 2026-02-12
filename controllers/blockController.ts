import type { Request, Response } from "express";
import { prisma } from "../lib/prisma.js";

export const blockUser = async (req: Request, res: Response) => {
  const { blockerId, blockedId } = req.body;
  try {
    if (!blockedId || !blockerId) {
      return res.status(400).json({
        success: false,
        message: "blocker and blocked id is required",
      });
    }
    await prisma.blockUser.create({
      data: {
        blocked_user_id: Number(blockedId),
        blocker_user_id: Number(blockerId),
      },
    });
    return res.status(201).json({
      success: true,
      message: "User blocked successfully",
    });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};
export const ckeckUserBlocked = async (req: Request, res: Response) => {
  const { blockerId, blockedId } = req.query;
  try {
    if (!blockedId || !blockerId) {
      return res.status(400).json({
        success: false,
        message: "blocker and blocked id is required",
      });
    }
    const isBlocked = await prisma.blockUser.findUnique({
      where: {
        blocked_user_id_blocker_user_id: {
          blocked_user_id: Number(blockedId),
          blocker_user_id: Number(blockerId),
        },
      },
    });

    return res.status(200).json({
      success: true,
      userBlock: isBlocked ? true : false,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};
export const unBlockUser = async (req: Request, res: Response) => {
  const { blockerId, blockedId } = req.body;
  try {
    if (!blockedId || !blockerId) {
      return res.status(400).json({
        success: false,
        message: "blocker and blocked id is required",
      });
    }
    await prisma.blockUser.delete({
      where: {
        blocked_user_id_blocker_user_id: {
          blocker_user_id: Number(blockerId),
          blocked_user_id: Number(blockedId),
        },
      },
    });

    res
      .status(200)
      .json({ success: true, message: "User unblocked successfully" });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};
