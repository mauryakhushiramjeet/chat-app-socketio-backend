import { Router } from "express";
import {
  getAllConverSationUsers,
  getAllFriends,
  getCurrentUser,
  login,
  signup,
  updateProfile,
} from "./controllers/userController";
import upload from "./lib/cloudinary";
import { addMessage, getAllMyMessages, getGroupMessages, getMessages } from "./controllers/messageController";
import { createGroup } from "./controllers/groupController";
import { sidebarChatList } from "./controllers/sidebarController";

const router = Router();

router.post("/signup", upload.single("image"), signup);
router.post("/login", login);

router.get("/getFriends/:id", getAllFriends);
router.get("/logedInUser/:id", getCurrentUser);
router.post("/addMessage", addMessage);
router.get("/getMessages", getMessages);
router.get("/userConversations", getAllConverSationUsers);
router.get("/getAllMyMessages",getAllMyMessages)
router.put("/updateProfile",upload.single("image"),updateProfile)
router.post("/createGroup",upload.single('image'),createGroup)
router.get("/getSidebarChatList",sidebarChatList)
router.get("/getGroupMessages",getGroupMessages)
export default router;
