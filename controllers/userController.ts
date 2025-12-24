import bcrypt from "bcrypt";

import { prisma } from "../lib/prisma";
import type { Request, Response } from "express";

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

    const user = await prisma.user.create({
      data: {
        name,
        email,
        image: req.file ? req.file.path : null,
        password: hashedPassword,
      },
    });
    console.log("save");

    return res.status(201).json({
      success: true,
      message: "Signup successful",
      data: {
        name: name,
        image: user.image,
        email: email,
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
        id:userExist.id,
        name: userExist.name,
        email: userExist.email,
        image: userExist.image,
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
