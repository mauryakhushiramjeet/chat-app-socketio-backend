import jwt from "jsonwebtoken";
export const verifyToken = (token, res) => {
    try {
        const decodeToken = jwt.verify(token, process.env.JWT_SECERATE);
        res.userId = decodeToken?.id;
    }
    catch (error) {
        console.log(error);
    }
};
