// //Router
// const router = require("express").Router();
// //@Model
// const { db } = require("./SqlDb"); // Ensure this exports your db configuration
// //Check the Admin Role
// const authorizeRoles = require("./authorizeRoles");
// //Check the Token
// const verifyToken = require("./verifyToken");
// const { body, validationResult } = require("express-validator");

// // Book a Meeting
// router.post(
//     "/book-meeting",
//     verifyToken,
//     [
//         // Validation checks
//         body("userId").notEmpty().withMessage("User ID is required."),
//         body("date").isISO8601().withMessage("Valid date is required."),
//         body("subject").notEmpty().withMessage("Subject is required."),
//         body("phone").optional().isString().withMessage("Phone must be a string."),
//     ],
//     async (req, res) => {
//         // Validate request body
//         const errors = validationResult(req);
//         if (!errors.isEmpty()) {
//             return res.status(400).json({
//                 status: "fail",
//                 errors: errors.array(),
//             });
//         }

//         const { userId, date, phone, subject } = req?.body;

//         try {
//             // Save the meeting in the meetings table
//             const meetingInsertResult = await db.query(
//                 "INSERT INTO meetings (user_id, date, phone, subject, status) VALUES ($1, $2, $3, $4, $5) RETURNING *",
//                 [userId, date, phone, subject, "pending"] // Default status to 'pending'
//             );

//             const meeting = meetingInsertResult.rows[0]; // Get the inserted meeting details

//             return res.status(201).json({
//                 status: "success",
//                 message: "Meeting booked successfully!",
//                 meeting, // Respond with the created meeting details
//             });
//         } catch (error) {
//             console.error("Error booking meeting:", error); // For debugging purposes, log error
//             return res.status(500).json({
//                 status: "error",
//                 message: "An error occurred while booking the meeting.",
//                 error:
//                     process.env.NODE_ENV === "development"
//                         ? error.message
//                         : "Internal server error", // Hide error details in production
//             });
//         }
//     }
// );

// // Get User by ID
// router.get("/:id", verifyToken, async (req, res) => {
//     try {
//         const { id } = req.params;

//         // Validate ID format (assuming you're using a UUID)
//         if (!id) {
//             return res.status(400).json({ message: "Invalid User ID format!" });
//         }

//         // Find the user by ID
//         const userResult = await db.query("SELECT * FROM users WHERE id = $1", [
//             id,
//         ]);

//         if (userResult.rows.length === 0) {
//             return res.status(404).json({ message: "User not found!" });
//         }

//         const user = userResult.rows[0];

//         // Respond with the user data
//         return res.status(200).json({
//             message: "User fetched successfully!",
//             user: {
//                 id: user.id,
//                 username: user.username,
//                 email: user.email,
//                 phone: user.phone,
//                 role: user.role,
//             },
//         });
//     } catch (error) {
//         console.error("Error fetching user by ID:", error);
//         return res.status(500).json({
//             message: "Internal server error.",
//             error: error.message,
//         });
//     }
// });

// // Update Meeting Status by Meeting ID
// const updateMeetingStatus = async (id, status) => {
//     try {
//         const result = await db.query(
//             `UPDATE meetings 
//              SET status = $1 
//              WHERE id = $2`, // Assuming 'id' is the primary key of the meetings table
//             [status, id]
//         );

//         return result.rowCount > 0; // Return true if a row was updated
//     } catch (error) {
//         throw new Error(
//             `Failed to update meeting for meetingId: ${id}. ${error.message}`
//         );
//     }
// };

// //@Put - Update meeting status
// router.put(
//     "/update-meeting",
//     authorizeRoles("admin", "subAdmin"),
//     async (req, res) => {
//         try {
//             const { meetingId, status } = req.body; // Extract meetingId and status from the request body

//             // Validate input
//             if (!meetingId || !status) {
//                 return res
//                     .status(400)
//                     .json({ message: "Both meetingId and status are required." });
//             }

//             // Update meeting status
//             const meetingUpdated = await updateMeetingStatus(meetingId, status);
//             if (!meetingUpdated) {
//                 return res.status(404).json({ message: "Meeting not found." });
//             }

//             return res.status(200).json({
//                 message: "Meeting status updated successfully.",
//                 status,
//             });
//         } catch (error) {
//             console.error("Error updating meeting status:", error);
//             return res
//                 .status(500)
//                 .json({ message: "Internal server error.", error: error.message });
//         }
//     }
// );

// module.exports = router;
