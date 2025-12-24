import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import { v2 as cloudinary } from "cloudinary";
cloudinary.config({
  cloud_name: "dbjudi79x",
  api_secret: "6b2c_7_Ifu2uiQbDirKg1OOK3PI",
  api_key: "693866212134612",
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    return {
      folder: "chat-app",
    };
  },
});
const upload=multer({storage})
export default upload