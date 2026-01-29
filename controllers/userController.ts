import bcrypt from "bcrypt";

import { prisma } from "../lib/prisma";
import type { Request, Response } from "express";
import { io, onlineUsers } from "../server";
import { createToken } from "../authMiddleware/createToken";
import { sendVerifyEmail } from "../emailServices";
export const signup = async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;
    const image = req.file;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "User already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const user = await prisma.user.create({
      data: {
        name,
        email,
        verificationCode: code,
        image: req.file ? req.file.path : null,
        password: hashedPassword,
      },
    });
    const userId = user?.id;
    const token = createToken(userId);
    const subject = "Your OTP Code for Email Verification";
    const warningMessage =
      "This is an email verification code. It will expire in";
    sendVerifyEmail(email, code, subject, warningMessage);
    console.log("save");

    return res.status(201).json({
      success: true,
      message: "We have sent a code to your email please check",
      data: {
        id: user.id,
        name: name,
        image: user.image,
        email: email,
        about: user?.about,
        isEmailVerify: user?.emailVerify,
      },
    });
  } catch (error) {
    console.log(error, "catch error");
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};
export const getAllConverSationUsers = async (req: Request, res: Response) => {
  const { loggedInUserId } = req.query;
  // console.log("loged userid  for conversation", loggedInUserId);
  try {
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

    const formatedCobnversation = conversations.map((conversation) => {
      const isLoggedUserIschatUser =
        conversation.chatUser?.id === Number(loggedInUserId);
      return {
        id: conversation?.id,
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
    return res.status(200).json({
      success: true,
      message: "conversation users gated successfully",
      formatedCobnversation,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error });
  }
};

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;
  try {
    if (!email || !password) {
      return res
        .status(400)
        .json({ success: false, message: "Email and password is required" });
    }
    const userExist = await prisma.user.findUnique({ where: { email } });
    if (!userExist) {
      return res.status(400).json({ success: false, message: "Invalide user" });
    }
    if (!userExist.emailVerify) {
      return res
        .status(400)
        .json({ success: false, message: "Email is not verify" });
    }
    const validatePassword = await bcrypt.compare(password, userExist.password);
    if (!validatePassword) {
      return res
        .status(400)
        .json({ success: false, message: "Invalide password" });
    }
    return res.status(200).json({
      success: true,
      message: "User login successfully",
      user: {
        id: userExist.id,
        name: userExist.name,
        email: userExist.email,
        image: userExist.image,
        about: userExist?.about,
        isEmailVerify: userExist?.emailVerify,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error });
  }
};

export const getAllFriends = async (req: Request, res: Response) => {
  const { id } = req.params;
  console.log(id);
  try {
    if (!id) {
      return res
        .status(400)
        .json({ success: false, message: "Id is required" });
    }
    const friends = await prisma.user.findMany({
      where: {
        id: {
          not: parseInt(id),
        },
      },
    });
    return res
      .status(200)
      .json({ success: true, message: "get user successfully", friends });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: error });
  }
};
export const getCurrentUser = async (req: Request, res: Response) => {
  const { id } = req.params;
  console.log(id);
  try {
    if (!id) {
      return res
        .status(400)
        .json({ success: false, message: "Id is required" });
    }
    const friends = await prisma.user.findMany({
      where: { id: parseInt(id) },
    });
    return res
      .status(200)
      .json({ success: true, message: "get logedInUser details", friends });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: error });
  }
};

export const updateProfile = async (req: Request, res: Response) => {
  const { userId, name, about } = req.body;
  console.log("user id is", typeof userId, name, about);
  try {
    if (!userId || !name || !about) {
      return res.status(400).json({
        success: true,
        message: "Name, bout of user and user id is required",
      });
    }
    const updatedUser = await prisma.user.update({
      where: { id: Number(userId) },
      data: {
        image: req.file ? req.file.path : null,
        name,
        about,
      },
    });
    Object.keys(onlineUsers).forEach((user) => {
      const socketId = onlineUsers[user];
      io.to(String(socketId)).emit("profile:updated", {
        userId: updatedUser.id,
        image: updatedUser.image,
        name: updatedUser.name,
        about: updatedUser.about,
      });
    });
    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        image: updatedUser.image,
        about: updatedUser?.about,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error });
  }
};
export const forgetPassword = async (req: Request, res: Response) => {
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
      where: {
        email: email,
      },
      data: {
        verificationCode: otp,
        verificationCodeExpiresAt: otpExpAt,
      },
    });
    const subject = "Forgot Password OTP";
    const warningMessage =
      "Use this code to forget your password. It will expire in";
    sendVerifyEmail(email, otp, subject, warningMessage);
    return res.status(200).json({
      success: true,
      message: "We have sent a code to your email please check",
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error });
  }
};
export const verifyForgetPasswordOtp = async (req: Request, res: Response) => {
  const { email, otp } = req.body;
  try {
    if (!email || !otp) {
      return res
        .status(400)
        .json({ success: false, message: "Email and otp are  required" });
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
    await prisma.user.update({
      where: {
        email: email,
      },
      data: {
        verificationCode: null,
        verificationCodeExpiresAt: null,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Otp verifeid successfully",
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error });
  }
};
export const resetPassword = async (req: Request, res: Response) => {
  const { email, newPassword } = req.body;
  try {
    if (!email || !newPassword) {
      return res
        .status(400)
        .json({ success: false, message: "Email and password are  required" });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }
    const hashPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: {
        email: email,
      },
      data: {
        password: hashPassword,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Password has been reset successfully",
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error });
  }
};
