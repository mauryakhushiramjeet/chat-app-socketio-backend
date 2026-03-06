import { NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
export const verifyToken = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const authorizationHeader = req.headers["authorization"];
  // console.log(authorizationHeader, "authorizationHeader......");
  if (!authorizationHeader) {
    // Handle the case where the authorization header is missing
    return next(new Error("Authorization header is missing"));
  }
  const token = authorizationHeader.split(" ")[1] as string;
  if (!token) {
    return next(new Error("Token is missing, Please login again"));
  }

  try {
    const decodeToken = jwt.verify(
      token,
      process.env.JWT_SECERATE!,
    ) as JwtPayload;
    (req as any).user = decodeToken?.id;
    console.log("1", decodeToken.id);

    next();
  } catch (error: unknown) {
    console.log(error);
    return next(new Error((error as Error).message));
  }
};
