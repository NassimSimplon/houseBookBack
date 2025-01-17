// DotEnv
import env from '../Config/Dotenv.js';
import { Router } from "express";
import { validationResult } from "express-validator";
import handleError from "../Utils/errorHandler.js";
import { HTTP_STATUS } from "../Utils/Helpers.js";
import authorizeRolesKey from "../Middlewares/authorizeRoles.js";
import verifyToken from "../Middlewares/verifyToken.js";
import { executeQuery } from "../Utils/dbHelper.js";
import { upload, uploadErrorHandler, processImages, deleteUploadedFile } from "../Middlewares/multer-config.js";
import { fileURLToPath } from 'url';
import { dirname, join, basename } from 'path';
import { unlink } from 'fs/promises';
import { fetchUserRoleAndImage, handleRequest, handleResponse, isRoleAuthorized, validateUserId } from "../Utils/userHelpers.js";
import { validateUserReqData } from "../Validators/requestValidators.js";

const router = Router();
//File Config
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const IMAGE_UPLOAD_PATH = join(__dirname, "../uploads");
//Check Permission
const isAuthorized = (userRole, currentRole, updates, userId, id) => {
  if (currentRole !== userRole) throw new Error("Your role has changed since the token was issued.");
  if (id !== userId.toString() && (!updates.role || ![env.ADMIN, env.SUB_ADMIN].includes(userRole))) {
    throw new Error("You are not authorized to update the user role.");
  }
};
// Utility function for handling file cleanup
const handleCleanup = async (uploadedFilePath) => {
  if (uploadedFilePath) {
    await deleteUploadedFile(uploadedFilePath);
  }
};
//Images Config
const prepareUpdateFields = (updates, uploadedFilePath) => {
  const fields = Object.keys(updates).map(key => `${key} = ?`).join(", ");
  const values = [...Object.values(updates), uploadedFilePath].filter(Boolean);
  return { fields, values };
};

const deleteUserById = async (id) => await executeQuery("DELETE FROM users WHERE id = ?", [id]);

/*@ADD USER*/
router.post(
  "/",
  authorizeRolesKey(env.ADMIN, env.SUB_ADMIN),
  validateUserReqData,
  async (req, res) => {
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "Validation failed.", validationErrors: errors.array() });
    }

    const { username, email, password, role, image, Title, phone } = req.body;

    try {
      // Check if the email already exists
      const existingUserQuery = "SELECT * FROM users WHERE email = ?";
      const existingUser = await executeQuery(existingUserQuery, [email]);

      if (existingUser.length) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "Email already exists." });
      }

      // Hash the password
      const hashedPassword = await hash(password, 10);

      // Insert new user into the database
      const insertUserQuery = `
        INSERT INTO users (username, email, password, role, image, Title, phone, created_at) 
        VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
      `;
      const insertResult = await executeQuery(insertUserQuery, [username, email, hashedPassword, role || "user", image, Title, phone]);

      // Check if user was created successfully
      if (insertResult.affectedRows === 0) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: "Failed to create user." });
      }

      res.status(HTTP_STATUS.CREATED).json({ message: "User created successfully." });
    } catch (error) {
      console.error("Error adding user:", error);
      handleError(res, error, "Error adding user");
    }
  }
);

/**
 * DELETE a user by ID 
 */
router.delete("/:id", authorizeRolesKey(env.ADMIN, env.SUB_ADMIN), async (req, res) => {
  await handleRequest(req, res, async () => {
    const { id } = req.params;

    if (!validateUserId(id)) {
      return handleResponse(res, HTTP_STATUS.BAD_REQUEST, "A valid user ID is required.");
    }

    const user = await fetchUserRoleAndImage(id);
    if (!user) {
      return handleResponse(res, HTTP_STATUS.NOT_FOUND, "User not found.");
    }

    const userRole = req.user.role;

    if (!isRoleAuthorized(user.role, userRole)) {
      return handleResponse(res, HTTP_STATUS.FORBIDDEN, "You do not have permission to delete this user.");
    }

    await deleteUserById(id);
    if (user.image) {
      await deleteUploadedFile(user.image);
    }

    handleResponse(res, HTTP_STATUS.OK, "User deleted successfully.");
  });
});
/**
 * Update user profile (self-update)
 */

router.put(
  "/:id",
  verifyToken,
  validateUserReqData,
  upload.single('image'),processImages
  , uploadErrorHandler,
  async (req, res) => {
    const uploadedFilePath = req.file ? `/uploads/${req.file.filename}` : null;

    try {
      await handleRequest(req, res, async () => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          await handleCleanup(uploadedFilePath);  // Cleanup on validation error
          return handleResponse(res, HTTP_STATUS.BAD_REQUEST, "Validation failed.", { validationErrors: errors.array() });
        }

        const { id } = req.params;
        const updates = req.body;
        const userRole = req.user.role;
        const userId = req.user.id;

        if (!validateUserId(id)) {
          await handleCleanup(uploadedFilePath);  // Cleanup on invalid user ID
          return handleResponse(res, HTTP_STATUS.BAD_REQUEST, "A valid user ID is required.");
        }

        const userInfo = await fetchUserRoleAndImage(id);
        if (!userInfo) {
          await handleCleanup(uploadedFilePath);  // Cleanup if user not found
          return handleResponse(res, HTTP_STATUS.NOT_FOUND, "User not found.");
        }

        const { role: currentRole, image: existingImage } = userInfo;
        isAuthorized(userRole, currentRole, updates, userId, id);

        if (Object.keys(updates).length === 0 && !uploadedFilePath) {
          await handleCleanup(uploadedFilePath);  // Cleanup if no valid fields
          return handleResponse(res, HTTP_STATUS.BAD_REQUEST, "No valid fields to update.");
        }

        const { fields, values } = prepareUpdateFields(updates, uploadedFilePath);
        values.push(id);

        const updateQuery = `UPDATE users SET ${fields}${uploadedFilePath ? ', image = ?' : ''} WHERE id = ?`;
        const updateResult = await executeQuery(updateQuery, values);

        if (updateResult.affectedRows === 0) {
          await handleCleanup(uploadedFilePath);  // Cleanup if update fails
          return handleResponse(res, HTTP_STATUS.NOT_FOUND, "User not found.");
        }

        // Delete existing image only if new image is uploaded
        if (uploadedFilePath && existingImage) {
          await deleteUploadedFile(existingImage);
        }

        handleResponse(res, HTTP_STATUS.OK, "User updated successfully.");
      });
    } catch (err) {
      // Cleanup if any unexpected error occurs
      await handleCleanup(uploadedFilePath);
      console.error("An error occurred during the request processing:", err);
      handleResponse(res, HTTP_STATUS.INTERNAL_SERVER_ERROR, "An internal error occurred.");
    }
  }
);

export default router;
