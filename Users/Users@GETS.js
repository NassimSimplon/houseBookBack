// DotEnv
import env from '../Config/Dotenv.js';
import { Router } from "express";
import { HTTP_STATUS } from "../Utils/Helpers.js";
import authorizeRolesKey from "../Middlewares/authorizeRoles.js";
import verifyToken from "../Middlewares/verifyToken.js";
import { executeQuery, fetchOne } from "../Utils/dbHelper.js";
import { handleRequest, handleResponse, validateUserId } from "../Utils/userHelpers.js";

const router = Router();

/**
 * GET all users 
 */
router.get("/", authorizeRolesKey(env.ADMIN, env.SUB_ADMIN), async (req, res) => {
  await handleRequest(req, res, async () => {
    const userId = req.user.id;
    const userRoleFromToken = req.user.role;

    const currentUser = await fetchOne("SELECT role FROM users WHERE id = ?", [userId]);
    if (!currentUser) return handleResponse(res, HTTP_STATUS.NOT_FOUND, "User not found.");

    const currentRole = currentUser.role;
    if (currentRole !== userRoleFromToken) return handleResponse(res, HTTP_STATUS.FORBIDDEN, "Your role has changed since the token was issued.");

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, parseInt(req.query.limit, 10) || 10);
    const offset = (page - 1) * limit;
    const selectedFields = req.query.fields ? req.query.fields.split(",").map(field => field.trim()).join(", ") : "*";

    const totalUsers = (await executeQuery("SELECT COUNT(*) AS total FROM users"))[0].total || 0;
    const users = await executeQuery(`SELECT ${selectedFields} FROM users LIMIT ? OFFSET ?`, [limit, offset]);

    if (!users.length) return handleResponse(res, HTTP_STATUS.NOT_FOUND, "No users found.", { users: [], pagination: { totalUsers, totalPages: 0, currentPage: page, limit } });

    const totalPages = Math.ceil(totalUsers / limit);
    handleResponse(res, HTTP_STATUS.OK, "Users retrieved successfully.", {
      data: users,
      pagination: { totalUsers, totalPages, currentPage: page, limit, hasNextPage: page < totalPages, hasPrevPage: page > 1 },
    });
  });
});

/**
 * GET User By ID
 */

router.get("/:id", verifyToken, async (req, res) => {
  await handleRequest(req, res, async () => {
    const { id } = req.params;

    // Validate user ID
    if (!validateUserId(id)) {
      return handleResponse(res, HTTP_STATUS.BAD_REQUEST, "A valid user ID is required.");
    }

    // Use all fields if no specific fields are requested
    const selectedFields = req.query.fields
      ? req.query.fields
          .split(",")
          .map((field) => field.trim())
          .join(", ") // Include all requested fields as is
      : "*"; // Default to all fields if none are specified

    const results = await executeQuery(`SELECT ${selectedFields} FROM users WHERE id = ?`, [id]);

    // Check if the user exists
    if (!results.length) {
      return handleResponse(res, HTTP_STATUS.NOT_FOUND, "User not found.");
    }

    const dbUser = results[0];
    const dbUserRole = dbUser.role;
    const tokenUserRole = req.user.role;

    // Check if the role in the token matches the role in the database
    if (roleHierarchy[tokenUserRole] < roleHierarchy[dbUserRole]) {
      return handleResponse(res, HTTP_STATUS.FORBIDDEN, "You do not have permission to access this user.");
    }

    if (
      (tokenUserRole === env.USER || tokenUserRole === env.OWNER) &&
      (dbUserRole === env.ADMIN || dbUserRole === env.SUB_ADMIN)
    ) {
      return handleResponse(res, HTTP_STATUS.FORBIDDEN, "You do not have permission to access this user.");
    }

    // Respond with user data
    handleResponse(res, HTTP_STATUS.OK, "User retrieved successfully.", { data: dbUser });
  });
});

 

export default router;
