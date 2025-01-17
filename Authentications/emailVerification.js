import handleError from "../Utils/errorHandler.js";
import jwt from "jsonwebtoken";
import { Router } from "express";
import { sendVerificationEmail } from "../Config/NodeMailer.js";
import { HTTP_STATUS, generateToken } from "../Utils/Helpers.js";
import { executeQuery, fetchOne } from "../Utils/dbHelper.js";

const router = Router();
const EMAIL_TOKEN_EXPIRY = "24h"; // Verification token expiry

// Utility function to validate input for token generation
const validateTokenInput = (data) => {
  const { email } = data;
  if (!email) {
    return "Email is required.";
  }
  return null;
};

/**
 * Generate new verification token
 */
router.post("/generate-token", async (req, res) => {
  const validationError = validateTokenInput(req.body);
  if (validationError) {
    return handleError(res, new Error(validationError), "Validation failed.", HTTP_STATUS.BAD_REQUEST);
  }

  const { email } = req.body;

  try {
    // Query to find the user by email
    const userQuery = "SELECT * FROM users WHERE email = ?";
    const results = await executeQuery(userQuery, [email]);

    // Check if the user exists
    if (results.length === 0) {
      return handleError(res, new Error("User not found."), "User not found.", HTTP_STATUS.BAD_REQUEST);
    }

    const user = results[0];

    // Check if the user is already verified
    if (user.verified) {
      return handleError(res, new Error("User is already verified."), "Already verified.", HTTP_STATUS.BAD_REQUEST);
    }

    // Generate new verification token
    const newToken = generateToken({ email }, EMAIL_TOKEN_EXPIRY);
    const updateTokenQuery = "UPDATE users SET verificationToken = ? WHERE email = ?";

    // Update the verification token in the database
    const updateResult = await executeQuery(updateTokenQuery, [newToken, email]);

    if (updateResult.affectedRows === 0) {
      return handleError(res, new Error("Failed to update verification token."), "Update failed.", HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }

    // Send verification email
    try {
      await sendVerificationEmail(email, newToken);
    } catch (emailError) {
      console.error("Error sending verification email:", emailError);
      // Roll back the token update if sending email fails
      const deleteTokenQuery = "UPDATE users SET verificationToken = NULL WHERE email = ?";
      await executeQuery(deleteTokenQuery, [email]);
      return handleError(res, new Error("Token updated, but failed to send email. Token has been cleared."), "Email sending failed.", HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }

    // Respond with success message
    res.status(HTTP_STATUS.OK).json({ message: "New verification token sent to your email." });
  } catch (error) {
    handleError(res, error, "Error generating new token");
  }
});

/**
 * Verify email endpoint
 */
router.get("/verify-email", async (req, res) => {
  const { token } = req.query;

  // Validate input
  if (!token) {
    return handleError(res, new Error("Token is required."), "Validation failed.", HTTP_STATUS.BAD_REQUEST);
  }

  try {
    // Verify the JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET); // Ensure JWT_SECRET is defined in your environment variables

    // Fetch user by email
    const userQuery = "SELECT * FROM users WHERE email = ?";
    const user = await fetchOne(userQuery, [decoded.email]);

    // Check if user exists
    if (!user) {
      return handleError(res, new Error("User not found."), "User not found.", HTTP_STATUS.BAD_REQUEST);
    }

    // Check if the email is already verified
    if (user.verified) {
      return handleError(res, new Error("Email already verified."), "Already verified.", HTTP_STATUS.BAD_REQUEST);
    }

    // Update user as verified
    const updateUserQuery = "UPDATE users SET verified = true, verificationToken = NULL WHERE email = ?";
    const updateResult = await executeQuery(updateUserQuery, [decoded.email]);

    if (updateResult.affectedRows === 0) {
      return handleError(res, new Error("Failed to update user verification status."), "Update failed.", HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }

    // Respond with success message
    res.status(HTTP_STATUS.OK).json({ message: "Email verified successfully." });
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return handleError(res, new Error("Invalid token."), "Unauthorized", HTTP_STATUS.UNAUTHORIZED);
    }
    console.error("Error verifying email:", error);
    handleError(res, error, "Error verifying email");
  }
});

export default router;
