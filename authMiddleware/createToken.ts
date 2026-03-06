import jwt from "jsonwebtoken";
export const createToken = async (userId: any) => {
  const token = jwt.sign({id:userId}, process.env.JWT_SECERATE!) as string;
  return token;
};
