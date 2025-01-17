import HouseMethods from "./Houses/HouseMethods.js";
import authController from "./Authentications/Controller.js";
import chats from "./Chat/chatController.js";
import cors from "cors";
import emailVerificationController from "./Authentications/emailVerification.js";
import env from "./Config/Dotenv.js";
import express, { json, urlencoded } from "express";
import houseGets from "./Houses/houseGets.js";
import http from "http";
import rateLimit from "express-rate-limit";
import rentGets from "./Rents/RentsGets.js";
import rentMethods from "./Rents/RentsMethods.js";
import resetPasswordController from "./Authentications/resetPassword.js";
import setupFileStreaming from "./images/setupFileStreaming.js";
import swaggerRoutes from "./Config/swaggerRoutes.js";
import userGets from "./Users/Users@GETS.js";
import userMethods from "./Users/User-Methods.js";
import { Server } from "socket.io";
import { transport } from "./Config/NodeMailer.js";
import { processImages, upload, uploadErrorHandler } from "./Middlewares/multer-config.js";
import { executeQuery } from "./Utils/dbHelper.js";

 




// Express setup
const app = express();
 

// Cors Option
const corsOptions = {
  origin: 'https://intacthome.tn' || 'https://intacthome.tn:1' || env.CORS_ORIGIN || 'http://localhost:3306',
};

///@CORS
app.use(cors());
// Middleware to parse URL-encoded data
app.use(urlencoded({ extended: true }));
// Middleware to parse JSON bodies
app.use(json());

// Rate Limiting: Protect registration route from brute-force attacks
const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit to 10 requests per IP
  message: {
    message: "Too many registration attempts from this IP, please try again later.",
  },
});

// Enable file streaming
setupFileStreaming(app);

// Apply routes 
app.use("/api/auth", registerLimiter, authController);
app.use("/api/user/gets", userGets);
app.use("/api/user/methods", userMethods);
app.use("/api/account", registerLimiter, emailVerificationController);
app.use("/api/password", registerLimiter, resetPasswordController);
app.use("/api/houses", houseGets);
app.use("/api/methods/houses", HouseMethods);
app.use("/api/rent/methods", rentMethods);
app.use("/api/rent", rentGets);
app.use("/api/chat", chats);

// Swagger API Documentation Routes
app.use('/api-docs', swaggerRoutes);

// Verify transporter
transport.verify((error) => {
  if (error) {
    console.error("❌ Error with email transporter:", error);
  } else {
    console.log("✅ Email transporter verified.");
  }
});

// Socket.IO Setup
const server = http.createServer(app); // Create an HTTP server
const io = new Server(server, {
  cors: {
    
    origin:  'http://localhost:5173', // Adjust CORS for Socket.IO
    methods: ["GET", "POST"],
  },
});

// Socket.IO connection
 
// Socket.IO connection handling
// Socket.io connection
const users = new Map(); // Maps user IDs to socket IDs
const activeChats = new Map(); // Maps user IDs to the chat they are currently viewing

io.on("connection", (socket) => {
  // Register the user
  socket.on("registerUser", async (userId) => {
    try {
      // Check if the socket_id already exists in the database for any user
      const existingSocket = await executeQuery(
        "SELECT * FROM user_sockets WHERE socket_id = ?",
        [socket.id]
      );

      if (existingSocket.length > 0) {
        // If it exists, update the user_id associated with this socket_id
        await executeQuery(
          "UPDATE user_sockets SET user_id = ? WHERE socket_id = ?",
          [userId, socket.id]
        );
      } else {
        // If not, insert the new user_id and socket_id
        await executeQuery(
          "INSERT INTO user_sockets (user_id, socket_id) VALUES (?, ?)",
          [userId, socket.id]
        );
      }

      // Update the in-memory map for immediate use
      users.set(userId, socket.id);
      console.log(`User registered: ${userId} -> ${socket.id}`);
    } catch (error) {
      console.error("Error registering user:", error.message);
      socket.emit("error", { message: "Failed to register user." });
    }
  });

  // Track the active chat for a user
  socket.on("openChat", async ({ userId, friendId }) => {
    activeChats.set(userId, friendId); // Set the active chat for the user
    console.log(`User ${userId} is now viewing chat with ${friendId}`);

    // Mark all unread messages as read when the chat is opened
    const updateQuery = `
      UPDATE messages 
      SET isRead = 1 
      WHERE senderId = ? AND receiverId = ? AND isRead = 0`;
    try {
      await executeQuery(updateQuery, [friendId, userId]);

      // Notify both users that messages have been marked as read
      const senderSocketId = users.get(friendId);
      const receiverSocketId = users.get(userId);

      if (senderSocketId) {
        io.to(senderSocketId).emit("messagesMarkedAsRead", { senderId: friendId, receiverId: userId });
      }
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("messagesMarkedAsRead", { senderId: friendId, receiverId: userId });
      }
    } catch (error) {
      console.error("Error marking messages as read:", error);
    }
  });

  // Clear the active chat when a user closes a chat
  socket.on("closeChat", (userId) => {
    activeChats.delete(userId); // Remove the active chat for the user
    console.log(`User ${userId} closed their active chat`);
  });

  // Get messages between two users
  socket.on("getMessages", async ({ userId, friendId }) => {
    const query = `
      SELECT * FROM messages 
      WHERE (senderId = ? AND receiverId = ?) 
      OR (senderId = ? AND receiverId = ?) 
      ORDER BY createdAt`;
    try {
      const messages = await executeQuery(query, [
        userId,
        friendId,
        friendId,
        userId,
      ]);
      socket.emit("messagesResponse", messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      socket.emit("error", { message: "Failed to fetch messages." });
    }
  });

  // Handle sending messages
  // When a new message is sent

// When a new message is sent
socket.on("sendMessage", async ({ senderId, receiverId, content }) => {
  // Check if the receiver is in the chat window
  const isReceiverInChat = activeChats.get(receiverId) === senderId;
  const isRead = isReceiverInChat ? 1 : 0;

  // Insert the message into the database
  const result = await executeQuery(
    "INSERT INTO messages (senderId, receiverId, content, isRead, createdAt) VALUES (?, ?, ?, ?, NOW())",
    [senderId, receiverId, content, isRead]
  );

  // Fetch the newly sent message with its unique ID
  const [newMessage] = await executeQuery(
    "SELECT * FROM messages WHERE id = ?",
    [result.insertId]
  );

  // Emit the new message to the sender
  io.to(users.get(senderId)).emit("newMessage", newMessage);

  // Emit the new message to the receiver
  const receiverSocketId = users.get(receiverId);
  if (receiverSocketId) {
    io.to(receiverSocketId).emit("newMessage", newMessage);
  }

  // If the receiver is in the chat, mark the message as read
  if (isRead) {
    // Notify both users that the message has been marked as read
    io.to(users.get(senderId)).emit("messagesMarkedAsRead", {
      senderId,
      receiverId,
    });
    io.to(users.get(receiverId)).emit("messagesMarkedAsRead", {
      senderId,
      receiverId,
    });
  }

  // Emit chatListUpdated to both the sender and receiver
  io.to(users.get(senderId)).emit("chatListUpdated", {
    userId: senderId,
    chatUserId: receiverId,
    lastMessageContent: newMessage.content,
    lastMessageCreatedAt: newMessage.createdAt,
    lastMessageIsRead: newMessage.isRead,
  });

  io.to(users.get(receiverId)).emit("chatListUpdated", {
    userId: receiverId,
    chatUserId: senderId,
    lastMessageContent: newMessage.content,
    lastMessageCreatedAt: newMessage.createdAt,
    lastMessageIsRead: newMessage.isRead,
  });
});

// When a user opens a chat window
socket.on("openChat", async ({ userId, friendId }) => {
  // Track the active chat for the user
  activeChats.set(userId, friendId);

  // If the receiver is in the chat, mark all unread messages as read
  if (activeChats.get(friendId) === userId) {
    const updateQuery = `
      UPDATE messages 
      SET isRead = 1 
      WHERE senderId = ? AND receiverId = ? AND isRead = 0`;
    await executeQuery(updateQuery, [friendId, userId]);

    // Fetch the updated messages
    const messagesQuery = `
      SELECT * FROM messages 
      WHERE (senderId = ? AND receiverId = ?) OR (senderId = ? AND receiverId = ?) 
      ORDER BY createdAt`;
    const updatedMessages = await executeQuery(messagesQuery, [
      userId,
      friendId,
      friendId,
      userId,
    ]);

    // Emit the updated messages to both users
    io.to(users.get(userId)).emit("messagesResponse", updatedMessages);
    io.to(users.get(friendId)).emit("messagesResponse", updatedMessages);

    // Notify both users that messages have been marked as read
    io.to(users.get(userId)).emit("messagesMarkedAsRead", {
      senderId: friendId,
      receiverId: userId,
    });
    io.to(users.get(friendId)).emit("messagesMarkedAsRead", {
      senderId: friendId,
      receiverId: userId,
    });
  }
});

  // Fetch chat list with unread message counts
  socket.on("getChatList", async (userId) => {
    const query = `
      SELECT 
          chatUserId,
          u.username,
          u.image,
          lastMessage.content AS lastMessageContent,
          lastMessage.createdAt AS lastMessageCreatedAt,
          lastMessage.isRead AS lastMessageIsRead
      FROM (
          SELECT 
              CASE 
                  WHEN m.senderId = ? THEN m.receiverId 
                  ELSE m.senderId 
              END AS chatUserId
          FROM messages m
          WHERE m.senderId = ? OR m.receiverId = ?
          GROUP BY chatUserId
      ) AS uniqueChatUsers
      JOIN users u ON uniqueChatUsers.chatUserId = u.id
      LEFT JOIN messages lastMessage ON 
          (lastMessage.senderId = uniqueChatUsers.chatUserId AND lastMessage.receiverId = ?) OR 
          (lastMessage.receiverId = uniqueChatUsers.chatUserId AND lastMessage.senderId = ?)
      WHERE lastMessage.createdAt = (
          SELECT MAX(createdAt)
          FROM messages
          WHERE 
              (senderId = uniqueChatUsers.chatUserId AND receiverId = ?) OR 
              (receiverId = uniqueChatUsers.chatUserId AND senderId = ?)
      )
    `;

    try {
      // Execute the query to fetch chat users
      const chatUsers = await executeQuery(query, [
        userId,
        userId,
        userId,
        userId,
        userId,
        userId,
        userId,
      ]);

      // Sort the chat users by `lastMessageCreatedAt` in descending order (newest first)
      const sortedChatUsers = chatUsers.sort((a, b) => {
        return new Date(b.lastMessageCreatedAt) - new Date(a.lastMessageCreatedAt);
      });

      // Send the sorted chat users back to the client
      socket.emit("chatListResponse", sortedChatUsers);
    } catch (error) {
      console.error("Error fetching chat list:", error);
      socket.emit("error", { message: "Failed to fetch chat list." });
    }
  });

  // Mark messages as read
  socket.on("markMessagesAsRead", async ({ userId, friendId }) => {
    const updateQuery = `
        UPDATE messages 
        SET isRead = 1 
        WHERE (senderId = ? AND receiverId = ?) OR (senderId = ? AND receiverId = ?)`;
    try {
        await executeQuery(updateQuery, [friendId, userId, userId, friendId]);

        // Notify both the sender and receiver that messages have been marked as read
        const senderSocketId = users.get(userId);
        const receiverSocketId = users.get(friendId);

        if (senderSocketId) {
            io.to(senderSocketId).emit("messagesMarkedAsRead", { senderId: userId, receiverId: friendId });
        }
        if (receiverSocketId) {
            io.to(receiverSocketId).emit("messagesMarkedAsRead", { senderId: userId, receiverId: friendId });
        }

        console.log(`Messages marked as read between ${userId} and ${friendId}`);
    } catch (error) {
        console.error("Error marking messages as read:", error);
    }
  });

  // Handle user disconnection
  socket.on("disconnect", async () => {
    try {
      // Remove the socket ID from the database
      await executeQuery("DELETE FROM user_sockets WHERE socket_id = ?", [socket.id]);

      // Remove the user from the in-memory map
      users.forEach((socketId, userId) => {
        if (socketId === socket.id) {
          users.delete(userId);
          console.log(`User disconnected: ${userId}`);
        }
      });

      // Remove the user's active chat
      activeChats.forEach((friendId, userId) => {
        if (users.get(userId) === socket.id) {
          activeChats.delete(userId);
          console.log(`Active chat cleared for user: ${userId}`);
        }
      });
    } catch (error) {
      console.error("Error removing socket ID:", error.message);
    }
  });
});
// File upload endpoint
app.post('/upload', upload.array('images', 10), processImages, uploadErrorHandler, (req, res) => {
  res.status(200).json({
    message: "Images uploaded and converted successfully.",
    files: req.files.map(file => file.filename),
  });
});

// Port
const PORT = env.PORT || 3000;

// Start the server
const startServer = (port, app) => {
  const server = app.listen(port, () => {
    console.log(`✅ Server is running at http://localhost:${server.address().port}`);
  });

  server.on("error", (error) => {
    if (error.code === "EADDRINUSE") {
      console.error(`❌ Port ${port} is in use. Trying another port...`);
      startServer(0, app); // Retry on a different port
    } else {
      console.error(`❌ Server failed to start: ${error.message}`);
    }
  });

  return server;
};
// Usage
startServer(PORT, server);
