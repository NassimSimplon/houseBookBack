import express from "express";
import { executeQuery } from "../Utils/dbHelper.js";

// server/chatController.js

const router = express.Router();

// Get messages between two users
router.get("/:userId/:friendId", async (req, res) => {
    const { userId, friendId } = req.params;

    const query =
        "SELECT * FROM messages WHERE (senderId = ? AND receiverId = ?) OR (senderId = ? AND receiverId = ?) ORDER BY createdAt";
    const messages = await executeQuery(query, [
        userId,
        friendId,
        friendId,
        userId,
    ]);

    res.json(messages);
});

// Send a message
router.post("/", async (req, res) => {
    const { senderId, receiverId, content } = req.body;

    const query =
        "INSERT INTO messages (senderId, receiverId, content) VALUES (?, ?, ?)";
    await executeQuery(query, [senderId, receiverId, content]);

    res.status(201).json({ message: "Message sent" });
});

// Fetch chat list with unread message counts
router.get("/chatList/:userId", async (req, res) => {
    const { userId } = req.params;

    const query = `
        SELECT users.id, users.username, 
            COUNT(CASE WHEN messages.isRead = FALSE THEN 1 END) AS unread_count
        FROM users
        LEFT JOIN messages ON (messages.receiverId = ? AND messages.senderId = users.id)
        GROUP BY users.id;
    `;

    const results = await executeQuery(query, [userId]);
    res.status(HTTP_STATUS.OK).json(results);
});

// Update read status
router.patch("/messages/read/:userId/:chatUserId", async (req, res) => {
    const { userId, chatUserId } = req.params;
  
    // Update query to mark messages as read between two users
    const updateQuery = `
      UPDATE messages 
      SET isRead = TRUE 
      WHERE (senderId = ? AND receiverId = ?) OR (senderId = ? AND receiverId = ?)
    `;
    
    try {
      // Execute the query with the respective user IDs
      await executeQuery(updateQuery, [chatUserId, userId, userId, chatUserId]);
      res.status(200).json({ message: "Messages marked as read." });
    } catch (error) {
      console.error("Error marking messages as read:", error);
      res.status(500).json({ error: "Failed to mark messages as read." });
    }
  });
  
  
  router.get("/test/a/:userId", async (req, res) => {
    const { userId } = req.params;

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
        const chatUsers = await executeQuery(query, [userId, userId, userId, userId, userId, userId, userId]);
        res.status(200).json(chatUsers);
    } catch (error) {
        console.error("Error fetching chat list:", error);
        res.status(500).json({ error: "Failed to fetch chat list." });
    }
});




export default router;
