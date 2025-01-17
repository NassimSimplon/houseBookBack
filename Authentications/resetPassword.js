import { Router } from "express";
import env from '../Config/Dotenv.js';
import { hash } from "bcrypt";
import jwt from "jsonwebtoken";
import { sendPasswordResetEmail } from "../Config/NodeMailer.js";
import handleError from "../Utils/errorHandler.js";
import { HTTP_STATUS, generateToken } from "../Utils/Helpers.js";
import { executeQuery, fetchOne } from "../Utils/dbHelper.js";

const router = Router();
const JWT_SECRET = env.JWT_SECRET || "NASSIM"; // Token Key
const PASSWORD_RESET_EXPIRY = "1h"; // Password reset token expiry

// Utility function to validate input for password reset request
const validateResetPasswordInput = (data) => {
  const { email } = data;
  if (!email) {
    return "Email is required.";
  }
  return null;
};

/**
 * Request password reset
 */
router.post("/reset-password", async (req, res) => {
  const validationError = validateResetPasswordInput(req.body);
  if (validationError) {
    return handleError(res, new Error(validationError), "Validation failed.", HTTP_STATUS.BAD_REQUEST);
  }

  const { email } = req.body;

  try {
    // Query to find the user by email
    const userQuery = "SELECT * FROM users WHERE email = ?";
    const user = await fetchOne(userQuery, [email]);

    // Check if user exists
    if (!user) {
      return handleError(res, new Error("User not found."), "User not found.", HTTP_STATUS.BAD_REQUEST);
    }

    // Generate password reset token
    const resetToken = generateToken({ email }, PASSWORD_RESET_EXPIRY);
    const updateTokenQuery = "UPDATE users SET resetToken = ? WHERE email = ?";

    // Update the password reset token in the database
    const updateResult = await executeQuery(updateTokenQuery, [resetToken, email]);
    if (updateResult.affectedRows === 0) {
      return handleError(res, new Error("Failed to update password reset token."), "Update failed.", HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }

    // Send password reset email
    try {
      await sendPasswordResetEmail(email, resetToken);
    } catch (emailError) {
      console.error("Error sending password reset email:", emailError);
      
      // Roll back the token update if email fails
      const deleteResetTokenQuery = "UPDATE users SET resetToken = NULL WHERE email = ?";
      await executeQuery(deleteResetTokenQuery, [email]);
      
      return handleError(res, new Error("Token updated, but failed to send email. Token has been cleared."), "Email sending failed.", HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }

    // Respond with success message
    res.status(HTTP_STATUS.OK).json({ message: "Password reset email sent." });
  } catch (error) {
    console.error("Error requesting password reset:", error);
    handleError(res, error, "Error requesting password reset");
  }
});

/**
 * Reset password endpoint
 */
router.post("/update-password", async (req, res) => {
  const { token, newPassword } = req.body;

  // Validate input
  if (!token || !newPassword) {
    return handleError(res, new Error("Token and new password are required."), "Validation failed.", HTTP_STATUS.BAD_REQUEST);
  }

  try {
    // Verify the JWT token
    const decoded = jwt.verify(token, JWT_SECRET);

    // Query to find the user by email
    const userQuery = "SELECT * FROM users WHERE email = ?";
    const user = await fetchOne(userQuery, [decoded.email]);

    // Check if user exists
    if (!user) {
      return handleError(res, new Error("User not found."), "User not found.", HTTP_STATUS.BAD_REQUEST);
    }

    // Check if the reset token matches
    if (user.resetToken !== token) {
      return handleError(res, new Error("Invalid password reset token."), "Unauthorized", HTTP_STATUS.UNAUTHORIZED);
    }

    // Hash the new password
    const hashedPassword = await hash(newPassword, 10);

    // Update the user's password
    const updatePasswordQuery = "UPDATE users SET password = ?, resetToken = NULL WHERE email = ?";
    const updateResult = await executeQuery(updatePasswordQuery, [hashedPassword, decoded.email]);

    if (updateResult.affectedRows === 0) {
      return handleError(res, new Error("Failed to update password."), "Update failed.", HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }

    // Respond with success message
    res.status(HTTP_STATUS.OK).json({ message: "Password updated successfully." });
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return handleError(res, new Error("Invalid token."), "Unauthorized", HTTP_STATUS.UNAUTHORIZED);
    }

    console.error("Error resetting password:", error);
    handleError(res, error, "Error resetting password");
  }
});

export default router;
