import jwt from "jsonwebtoken";
export const createToken = async (userId) => {
    const token = jwt.sign({ id: userId }, process.env.JWT_SECERATE);
    return token;
};
