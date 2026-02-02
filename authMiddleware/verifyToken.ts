import jwt, { JwtPayload } from "jsonwebtoken";
export const verifyToken = (token: string, res: Response) => {
  try {
    const decodeToken = jwt.verify(
      token,
      process.env.JWT_SECERATE!,
    ) as JwtPayload;
    (res as any).userId = decodeToken?.id;
  } catch (error) {
    console.log(error);
  }
};
