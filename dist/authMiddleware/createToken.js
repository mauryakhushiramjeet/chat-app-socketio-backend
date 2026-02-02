import jwt from "jsonwebtoken";
export const createToken = async (userId) => {
    const token = jwt.sign(userId, process.env.JWT_SECERATE);
    return token;
};
