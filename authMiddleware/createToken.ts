import jwt from "jsonwebtoken";
export const createToken = async (userId: any) => {
  const token = jwt.sign(userId, process.env.JWT_SECERATE!);
  return token;
};
