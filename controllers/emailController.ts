import { prisma } from "../lib/prisma";
import type { Request, Response } from "express";
const emailOtpVerify = async (req: Request, res: Response) => {
  const { email, otp } = req.body;

  try {
    if (!email || !otp) {
      return res
        .status(400)
        .json({ success: false, message: "Email and OTP are required" });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    if (user.verificationCode !== otp) {
      return res.status(400).json({ success: false, message: "Invalid OTP" });
    }

    await prisma.user.update({
      where: { email },
      data: { verificationCode: null },
    });

    return res
      .status(200)
      .json({ success: true, message: "Email verified successfully" });
  } catch (error: any) {
    console.error("OTP verification error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

export default emailOtpVerify;
