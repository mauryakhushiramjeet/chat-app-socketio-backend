import admin from "./firebaseAdmin.js";
const sendNotification = async (
  token: string,
  title: string,
  body: string,
  image: string | null,
  type: string,
) => {
  try {
    await admin.messaging().send({
      token: token,
      // notification payload is REQUIRED for background notifications
      // notification: {
      //   title: title,
      //   body: body,
      //   imageUrl: image ?? "",
      // },
      data: {
        title: title,
        body: body,
        type: type,
        image: image ?? "",
      },
    });
    console.log("Notification sent!!!!");
  } catch (error) {
    console.error("FCM error:", error);
  }
};
export default sendNotification;
