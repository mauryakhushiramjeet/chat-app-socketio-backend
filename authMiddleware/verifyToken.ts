import jwt from "jsonwebtoken";
import { error } from "node:console";
export const verifyToken = (token: string, res: Response) => {
  try {
    const decodeToken = jwt.verify(token, process.env.JWT_SECERATE!);
    (res as any).userId = decodeToken?.id as string;
  } catch (errro) {
    console.log(error);
  }
};
