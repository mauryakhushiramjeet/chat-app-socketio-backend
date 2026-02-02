import { sendVerifyEmail } from "../emailServices.js";
import { prisma } from "../lib/prisma.js";
import type { Request, Response } from "express";
export const emailOtpVerify = async (req: Request, res: Response) => {
  const { email, otp } = req.body;
  console.log(email, otp);
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
    if (
      user.verificationCodeExpiresAt &&
      user.verificationCodeExpiresAt < new Date()
    ) {
      return res
        .status(400)
        .json({ success: false, message: "OTP expired. Please try again." });
    }
    if (user.verificationCode !== otp) {
      return res.status(400).json({ success: false, message: "Invalid OTP" });
    }

    const updatedUser = await prisma.user.update({
      where: { email },
      data: {
        verificationCode: null,
        verificationCodeExpiresAt: null,
        emailVerify: true,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Otp verified successfully",
      data: {
        id: updatedUser.id,
        name: updatedUser?.name,
        image: updatedUser.image,
        email: updatedUser?.email,
        about: updatedUser?.about,
        isEmailVerify: updatedUser?.emailVerify,
      },
    });
  } catch (error: any) {
    console.error("OTP verification error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

export const resentOtpEmail = async (req: Request, res: Response) => {
  const { email } = req.body;

  try {
    if (!email) {
      return res
        .status(400)
        .json({ success: false, message: "Email is required" });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const otp = Math.floor(100000 + Math.random() * 999999).toString();
    const otpExpAt = new Date(Date.now() + 5 * 60 * 1000);
    await prisma.user.update({
      where: { email },
      data: { verificationCode: otp, verificationCodeExpiresAt: otpExpAt },
    });
    const subject = "Resend OTP Code for Email Verification";
    const warningMessage =
      "This is an email verification code. It will expire in";
    sendVerifyEmail(email, otp, subject, warningMessage);
    return res.status(200).json({
      success: true,
      message: "We have sent a code to your email please check",
    });
  } catch (error: any) {
    console.error("Resend email verification otp error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};
export const forgetPasswordEmailVerify = async (
  req: Request,
  res: Response,
) => {
  const { email } = req.body;
  console.log(email, "in forget");
  try {
    if (!email) {
      return res
        .status(400)
        .json({ success: false, message: "Email is required" });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const otp = Math.floor(100000 + Math.random() * 999999).toString();
    const otpExpAt = new Date(Date.now() + 5 * 60 * 1000);
    await prisma.user.update({
      where: { email },
      data: { verificationCode: otp, verificationCodeExpiresAt: otpExpAt },
    });
    const subject = "Email verification for forget password";
    const warningMessage =
      "This is an email verification code for forget password. It will expire in";
    sendVerifyEmail(email, otp, subject, warningMessage);
    return res.status(200).json({
      success: true,
      message: "We have sent a code to your email please check",
    });
  } catch (error: any) {
    console.error("Forget password email verify error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};
export const resendMailForgetPassword = async (req: Request, res: Response) => {
  const { email } = req.body;
  console.log("email in forget resend", email);
  try {
    if (!email) {
      return res
        .status(400)
        .json({ success: false, message: "Email is required" });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const otp = Math.floor(100000 + Math.random() * 999999).toString();
    const otpExpAt = new Date(Date.now() + 5 * 60 * 1000);
    await prisma.user.update({
      where: { email },
      data: { verificationCode: otp, verificationCodeExpiresAt: otpExpAt },
    });
    const subject = "Resend OTP Code for Forget Password";
    const warningMessage = "This is an forget password code. It will expire in";
    sendVerifyEmail(email, otp, subject, warningMessage);
    return res.status(200).json({
      success: true,
      message: "We have sent a code to your email please check",
      data: email,
    });
  } catch (error: any) {
    console.error("Resend forget password email otp error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};
export const resendMailVerify = async (req: Request, res: Response) => {
  const { email } = req.body;
  console.log("email in forget resend", email);
  try {
    if (!email) {
      return res
        .status(400)
        .json({ success: false, message: "Email is required" });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const otp = Math.floor(100000 + Math.random() * 999999).toString();
    const otpExpAt = new Date(Date.now() + 5 * 60 * 1000);
    await prisma.user.update({
      where: { email },
      data: { verificationCode: otp, verificationCodeExpiresAt: otpExpAt },
    });
    const subject = "Resend OTP Code for email verify";
    const warningMessage = "This is an email verify code. It will expire in";
    sendVerifyEmail(email, otp, subject, warningMessage);
    return res.status(200).json({
      success: true,
      message: "We have sent a code to your email please check",
      data: email,
    });
  } catch (error: any) {
    console.error("emailverify error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};
