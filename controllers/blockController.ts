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
export const getAllBlockedUsersByLoggedInUser = async (
  req: Request,
  res: Response,
) => {
  const id = req.user;
  try {
    console.log(id, "logged user oid");
    if (!id) {
      return res.status(400).json({
        success: false,
        message: "blocker id is required",
      });
    }
    const blocked_Users = await prisma.blockUser.findMany({
      where: {
        blocker_user_id: Number(id),
      },
      select: {
        blocked_user_id: true,
      },
    });

    return res.status(200).json({
      success: true,
      blocked_Users,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error });
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
