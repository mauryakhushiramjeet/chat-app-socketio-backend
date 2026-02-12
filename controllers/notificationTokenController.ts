import { prisma } from "../lib/prisma.js";
import type { Request, Response } from "express";
export const saveFcmToken = async (req: Request, res: Response) => {
  const { fcmToken, userId } = req.body;
  try {
    if (!userId) {
      return res
        .status(400)
        .json({ success: false, message: "User id is required." });
    }
    if (!fcmToken) {
      return res
        .status(400)
        .json({ success: false, message: "Device token is required." });
    }
    const addToken = await prisma.userDeviceFcmToken.upsert({
      where: { fcm_Token: fcmToken },
      update: {
        userId: Number(userId),
      },
      create: {
        fcm_Token: fcmToken,
        userId: Number(userId),
      },
    });
    return res
      .status(201)
      .json({ success: true, message: "token created successfully" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error });
  }
};
