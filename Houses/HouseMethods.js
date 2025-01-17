import authorizeRoles from "../Middlewares/authorizeRoles.js";
import env from "../Config/Dotenv.js";
import handleError from "../Utils/errorHandler.js";
import { Router } from "express";
import { validationResult } from "express-validator";
import { HTTP_STATUS } from "../Utils/Helpers.js";
import { executeQuery, fetchOne } from "../Utils/dbHelper.js";
import { validateHouseReqData } from "../Validators/requestValidators.js";

import {
  fetchUserRole,
  fetchUserRoleAndImage,
  isRoleAuthorized,
} from "../Utils/userHelpers.js";

import {
  upload,
  uploadErrorHandler,
  processImages,
  deleteUploadedFiles,
} from "../Middlewares/multer-config.js";

const router = Router();

// Utility function to validate house data
const validateHouseData = (req) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return {
      valid: false,
      message: "Validation errors occurred.",
      errors: errors.array(),
    };
  }

  const { ownerID, description, pricePerDay } = req.body;
  if (!ownerID || !description || !pricePerDay) {
    return {
      valid: false,
      message: "OwnerID, description, and pricePerDay are required.",
    };
  }

  return { valid: true }; // Validation successful
};

// Utility function to fetch house details
const getHouseDetails = async (id) => {
  const query = `SELECT ownerID, images FROM houses WHERE id = ?;`;
  const result = await executeQuery(query, [id]);
  return result.length ? result[0] : null;
};

// Utility function to save house data
const saveHouseData = async (query, values) => {
  try {
    console.log("Executing query:", query, "with values:", values);
    const result = await executeQuery(query, values); // Execute the main query
    return result; // Return the result of the query
  } catch (error) {
    console.error("Error saving house data:", error.message);
    throw error; // Re-throw the error to be caught in the main route
  }
};

// Utility function to check user permissions
const isUserAllowedToUpdate = (userRole, houseOwnerId, userId) => {
  if (userRole === env.OWNER) {
    return houseOwnerId === userId;
  }
  return [env.ADMIN, env.SUB_ADMIN].includes(userRole);
};
// Create house
router.post(
  "/",
  authorizeRoles(env.ADMIN, env.SUB_ADMIN, env.OWNER),
  upload.array("images", 10),
  processImages,
  uploadErrorHandler,
  async (req, res) => {
    const userRole = req.user.role;
    const adminConfirmation = [env.ADMIN, env.SUB_ADMIN].includes(userRole)
      ? "confirmed"
      : "pending";

    const images = req.files.map((file) => `/uploads/${file.filename}`);
    const houseData = {
      ...req.body,
      images: JSON.stringify(images),
      adminConfirmation,
      created_at: new Date(),
      startDate: req.body.startDate ? new Date(req.body.startDate) : null,
      endDate: req.body.endDate ? new Date(req.body.endDate) : null,
      address: `${req.body.country} ${req.body.street} ${req.body.ville} ${req.body.state} ${req.body.zipCode}`,
    };

    const columns = Object.keys(houseData).join(", ");
    const placeholders = Object.keys(houseData)
      .map(() => "?")
      .join(", ");
    const values = Object.values(houseData);

    const insertQuery = `INSERT INTO houses (${columns}) VALUES (${placeholders});`;

    try {
      const insertResult = await saveHouseData(insertQuery, values);

      // Fetch the newly created house details using the `insertId`
      const houseId = insertResult.insertId; // Use `insertId` provided by the database
      const newHouse = await getHouseDetails(houseId);

      return res.status(HTTP_STATUS.CREATED).json({
        message: "House created successfully.",
        house: newHouse,
      });
    } catch (error) {
      console.error("Error during house creation:", error.message);
      await deleteUploadedFiles(images); // Ensure images are deleted on error
      return handleError(
        res,
        "Database error: " + error.message,
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        error
      );
    }
  }
);

// Update house
router.put(
  "/:id",
  authorizeRoles(env.ADMIN, env.SUB_ADMIN, env.OWNER),
  upload.array("images", 10),
  processImages,
  uploadErrorHandler,
  async (req, res) => {
    const { id } = req.params;

    let newImages = [];
    let oldImages = [];

    try {
      // Fetch existing house details
      const houseDetails = await getHouseDetails(id);
      if (!houseDetails) {
        return res
          .status(HTTP_STATUS.NOT_FOUND)
          .json({ message: "House not found." });
      }

      oldImages = houseDetails.images || [];

      // Prepare updated fields
      const updatedFields = { ...req.body };

      // Process newly uploaded images
      if (req.files.length > 0) {
        newImages = req.files.map((file) => `/uploads/${file.filename}`);
        updatedFields.images = JSON.stringify([...newImages]);
      }

      // Check user permissions
      const user = await fetchUserRole(req.user.id);

      if (!user) {
        return handleError(res, "User not found.", HTTP_STATUS.NOT_FOUND);
      }
      if (
        !isUserAllowedToUpdate(user.role, houseDetails.ownerID, req.user.id)
      ) {
        await deleteUploadedFiles(newImages);
        return res.status(HTTP_STATUS.FORBIDDEN).json({
          message: "You do not have permission to update this house.",
        });
      }

      const updateQuery = `UPDATE houses SET ${Object.keys(updatedFields)
        .map((key) => `${key} = ?`)
        .join(", ")} WHERE id = ?`;
      const values = [...Object.values(updatedFields), id];

      // Attempt to update the house data
      await saveHouseData(updateQuery, values);

      // If update succeeds, delete old images
      if (oldImages.length > 0) {
        await deleteUploadedFiles(oldImages);
      }

      // Fetch updated house details
      const updatedHouse = await getHouseDetails(id);

      return res.status(HTTP_STATUS.OK).json({
        message: "House updated successfully.",
        house: updatedHouse,
      });
    } catch (err) {
      console.error("Error updating house entry:", err.message);

      // Rollback: Delete newly uploaded images if something goes wrong
      if (newImages.length > 0) {
        try {
          await deleteUploadedFiles(newImages);
        } catch (deleteErr) {
          console.error(
            "Error deleting newly uploaded images:",
            deleteErr.message
          );
        }
      }

      return handleError(
        res,
        "An internal error occurred while updating the house.",
        HTTP_STATUS.INTERNAL_SERVER_ERROR
      );
    }
  }
);

// Delete house
router.delete(
  "/:id",
  authorizeRoles(env.ADMIN, env.SUB_ADMIN),
  async (req, res) => {
    const { id } = req.params;

    if (isNaN(id)) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json({ message: "Invalid house ID format." });
    }

    const user = await fetchUserRoleAndImage(req.user.id);
    if (!user) {
      return handleError(res, "User not found.", HTTP_STATUS.NOT_FOUND);
    }

    if (!isRoleAuthorized(user.role, req.user.role)) {
      return handleError(
        res,
        "You do not have permission to delete this house.",
        HTTP_STATUS.FORBIDDEN
      );
    }

    const houseDetails = await getHouseDetails(id);
    if (!houseDetails) {
      return res
        .status(HTTP_STATUS.NOT_FOUND)
        .json({ message: "House not found." });
    }

    try {
      // Delete house from the database
      await executeQuery("DELETE FROM houses WHERE id = ?;", [id]);

      // Attempt to delete files only if the database deletion was successful
      try {
        await deleteUploadedFiles(JSON.parse(houseDetails.images));
      } catch (fileError) {
        console.error("Error deleting house images:", fileError.message);
        // Log the error but do not throw it to ensure the user still gets a success response
      }

      return res.status(HTTP_STATUS.OK).json({
        message: "House deleted successfully.",
        house: houseDetails,
      });
    } catch (error) {
      console.error("Error deleting house:", error.message);
      return handleError(
        res,
        "Error deleting house. Please try again later.",
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        error
      );
    }
  }
);

export default router;
