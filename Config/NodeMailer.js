 
import { createTransport } from "nodemailer";
import env from '../Config/Dotenv.js';

// Load environment variables

const EMAIL_USER =
  env.EMAIL_USER || "nassimkhlifisimplonenda@gmail.com";
const EMAIL_PASS = env.EMAIL_PASS || "ztmu dric hqby dldq";

// Email token expiration settings
const EMAIL_TOKEN_EXPIRY = "24h"; // Verification token expiry
const PASSWORD_RESET_EXPIRY = "1h"; // Password reset token expiry

// Initialize nodemailer transporter
const transport = createTransport({
  service: "gmail",
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASS,
  },
});
/**
 * Utility function to send verification email
 */
const sendVerificationEmail = async (email, token) => {
  const verificationLink = `http://localhost:5000/app/verify-email?token=${token}`;
  const mailOptions = {
    from: EMAIL_USER,
    to: email,
    subject: "Verify Your Email",
    html: `
      <h1>Email Verification</h1>
      <p>Please verify your email by clicking the link below:</p>
      <a href="${verificationLink}">Verify Email</a>
      <p>This link will expire in 24 hours.</p>
    `,
  };

  try {
    await transport.sendMail(mailOptions);
    console.log(`Verification email sent to ${email}`);
  } catch (error) {
    console.error("Error sending verification email:", error);
    throw error;
  }
};

/**
 * Utility function to send password reset email
 */
const sendPasswordResetEmail = async (email, token) => {
  const resetLink = `http://localhost:5000/app/reset-password?token=${token}`;
  const mailOptions = {
    from: EMAIL_USER,
    to: email,
    subject: "Reset Your Password",
    html: `
      <h1>Password Reset</h1>
      <p>Please reset your password by clicking the link below:</p>
      <a href="${resetLink}">Reset Password</a>
      <p>This link will expire in 1 hour.</p>
    `,
  };

  try {
    await transport.sendMail(mailOptions);
    console.log(`Password reset email sent to ${email}`);
  } catch (error) {
    console.error("Error sending password reset email:", error);
    throw error;
  }
};

export   {
    transport,
    sendPasswordResetEmail,
    sendVerificationEmail
}