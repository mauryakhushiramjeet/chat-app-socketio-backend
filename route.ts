import { Router } from "express";
import {
  getAllConverSationUsers,
  getAllFriends,
  getCurrentUser,
  login,
  signup,
} from "./controllers/userController";
import upload from "./lib/cloudinary";
import { addMessage, getMessages } from "./controllers/messageController";

const router = Router();

router.post("/signup", upload.single("image"), signup);
router.post("/login", login);

router.get("/getFriends/:id", getAllFriends);
router.get("/logedInUser/:id", getCurrentUser);
router.post("/addMessage", addMessage);
router.get("/getMessages", getMessages);
router.get("/userConversations", getAllConverSationUsers);
export default router;
