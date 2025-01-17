
// Imed.nass123456
import { Router } from "express";
import { hash, compare } from "bcrypt";
import { sendVerificationEmail } from "../Config/NodeMailer.js";
import handleError from "../Utils/errorHandler.js";
import { HTTP_STATUS, generateToken } from "../Utils/Helpers.js";
import { executeQuery } from "../Utils/dbHelper.js";

const router = Router();
const EMAIL_TOKEN_EXPIRY = "24h"; // Verification token expiry

// Utility function to validate user registration input
const validateRegistrationInput = (data) => {
  const { username, email, password, phone } = data;
  const errors = [];
  if (!username) errors.push("Username is required.");
  if (!email) errors.push("Email is required.");
  if (!password) errors.push("Password is required.");
  if (!phone) errors.push("Phone is required.");
  return errors.length ? errors : null;
};

// Utility function to validate user login input
const validateLoginInput = (data) => {
  const { email, password } = data;
  const errors = [];
  if (!email) errors.push("Email is required.");
  if (!password) errors.push("Password is required.");
  return errors.length ? errors : null;
};

/**
 * Register endpoint
 */
router.post("/register", async (req, res) => {
  const { username, email, password, phone, title = "User" } = req.body;

  const validationErrors = validateRegistrationInput(req.body);
  if (validationErrors) {
    return handleError(
      res,
      new Error(validationErrors.join(" ")),
      "Validation failed.",
      HTTP_STATUS.BAD_REQUEST
    );
  }

  try {
    // Check if the user already exists
    const existingUserQuery = "SELECT verified FROM users WHERE email = ?";
    const [existingUser] = await executeQuery(existingUserQuery, [email]);

    if (existingUser) {
      if (!existingUser.verified) {
        return res.status(HTTP_STATUS.OK).json({
          message: "Email is already registered but not verified.",
          action: "Would you like to generate a new verification token?",
        });
      }
      return handleError(
        res,
        new Error("Email is already registered."),
        "Email already exists.",
        HTTP_STATUS.BAD_REQUEST
      );
    }

    // Hash password and generate verification token
    const hashedPassword = await hash(password, 10);
    const verificationToken = generateToken({ email }, EMAIL_TOKEN_EXPIRY);

    // Insert new user into the database
    const insertUserQuery =
      "INSERT INTO users (username, email, password, phone, title, verified, verificationToken, created_at) VALUES (?, ?, ?, ?, ?, false, ?, NOW())";
    const insertResult = await executeQuery(insertUserQuery, [
      username,
      email,
      hashedPassword,
      phone,
      title,
      verificationToken,
    ]);

    if (insertResult.affectedRows === 0) {
      return handleError(
        res,
        new Error("Failed to register user in the database."),
        "Registration failed.",
        HTTP_STATUS.INTERNAL_SERVER_ERROR
      );
    }

    // Send verification email
    try {
      await sendVerificationEmail(email, verificationToken);
    } catch (emailError) {
      console.error("Error sending verification email:", emailError);
      // Roll back the database insert if email fails
      await executeQuery("DELETE FROM users WHERE email = ?", [email]); // Roll back user creation
      return handleError(
        res,
        new Error("User registered, but failed to send verification email. User has been removed."),
        "Email sending failed.",
        HTTP_STATUS.INTERNAL_SERVER_ERROR
      );
    }

    // Respond with success message
    res.status(HTTP_STATUS.CREATED).json({
      message: "User registered. Please verify your email.",
    });
  } catch (error) {
    handleError(res, error, "Error during registration");
  }
});

/**
 * Login endpoint
 */
router.post("/login", async (req, res) => {
  const validationErrors = validateLoginInput(req.body);
  if (validationErrors) {
    return handleError(
      res,
      new Error(validationErrors.join(" ")),
      "Bad request",
      HTTP_STATUS.BAD_REQUEST
    );
  }

  const { email, password } = req.body;

  try {
    const userQuery = "SELECT * FROM users WHERE email = ?";
    const results = await executeQuery(userQuery, [email]);

    if (!results || results.length === 0) {
      return handleError(
        res,
        new Error("Invalid credentials."),
        "Unauthorized",
        HTTP_STATUS.UNAUTHORIZED
      );
    }

    const user = results[0];

    if (!user.verified) {
      return handleError(
        res,
        new Error("Email not verified."),
        "Unauthorized",
        HTTP_STATUS.UNAUTHORIZED
      );
    }

    const isMatch = await compare(password, user.password);
    if (!isMatch) {
      return handleError(
        res,
        new Error("Invalid credentials."),
        "Unauthorized",
        HTTP_STATUS.UNAUTHORIZED
      );
    }

    const updateLoginTimeQuery = "UPDATE users SET last_login = NOW() WHERE email = ?";
    await executeQuery(updateLoginTimeQuery, [email]);

    const token = generateToken(user, "1h");
    res.status(HTTP_STATUS.OK).json({ message: "Login successful.", token });
  } catch (error) {
    handleError(res, error, "Error during login");
  }
});


export default router;
