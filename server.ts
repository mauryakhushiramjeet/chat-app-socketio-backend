import "dotenv/config";
import express from "express";
import router from "./route";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import axios from "axios";
const PORT = process.env.PORT || 8050;
const app = express();
app.use(cors({ origin: "http://localhost:3000" }));
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
  },
});
app.use(express.json());
io.on("connection", (socket) => {
  console.log("socket connected:", socket.id);
  socket.on("joinRoom", ({ senderId, receiverId }) => {
    const roomId =
      senderId < receiverId
        ? `${senderId}-${receiverId}`
        : `${receiverId}-${senderId}`;
    socket.join(roomId);
    const clients = io.sockets.adapter.rooms.get(roomId);
    console.log("ROOM:", roomId);
    // console.log("TOTAL SOCKETS:", clients ? clients.size : 0);
  });
  socket.on("typing", ({ senderId, receiverId }) => {
    console.log("typing signle recive");
    const roomId =
      senderId < receiverId
        ? `${senderId}-${receiverId}`
        : `${receiverId}-${senderId}`;

    socket.to(roomId).emit("userTyping", {
      senderId,
      receiverId,
    });
  });
  socket.on("stopTyping", ({ senderId, receiverId }) => {
    const roomId =
      senderId < receiverId
        ? `${senderId}-${receiverId}`
        : `${receiverId}-${senderId}`;

    socket.to(roomId).emit("userStopTyping", {
      senderId,
      receiverId,
    });
  });
  socket.on("sendMessage", async ({ senderId, receiverId, text }) => {
    const roomId =
      senderId < receiverId
        ? `${senderId}-${receiverId}`
        : `${receiverId}-${senderId}`;
    const addMessage = await axios.post("http://localhost:8085/addMessage", {
      senderId,
      receiverId,
      text,
    });
    const resposne =addMessage.data.messages;
    socket.to(roomId).emit("newMessage", { resposne });
  });
  socket.on("disconnect", () => {
    console.log("socket disconnected:", socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`server is listen on port ${PORT}`);
});
app.use(router);
app.get("/", (req, res) => {
  return res.send(`server is running successfully on port ${PORT}`);
});
