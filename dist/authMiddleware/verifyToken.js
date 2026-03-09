import jwt from "jsonwebtoken";
export const verifyToken = (req, res, next) => {
    const authorizationHeader = req.headers["authorization"];
    if (!authorizationHeader) {
        // Handle the case where the authorization header is missing
        return next(new Error("Authorization header is missing"));
    }
    const token = authorizationHeader.split(" ")[1];
    if (!token) {
        return next(new Error("Token is missing, Please login again"));
    }
    try {
        const decodeToken = jwt.verify(token, process.env.JWT_SECERATE);
        req.user = decodeToken?.id;
        console.log("1", decodeToken.id);
        next();
    }
    catch (error) {
        console.log(error);
        return next(new Error(error.message));
    }
};
