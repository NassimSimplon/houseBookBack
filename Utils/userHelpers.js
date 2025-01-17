import { executeQuery } from "./dbHelper.js";
import handleError from "./errorHandler.js";

const handleResponse = (res, status, message, data = {}) => {
    res.status(status).json({ message, ...data });
  };
// Utility functions
const validateUserId = (id) => {
  return Number.isInteger(Number(id)) && Number(id) > 0;
};


// Centralized error handling and response logic
const handleRequest = async (req, res, callback) => {
    try {
      await callback(req, res);
    } catch (error) {
      handleError(res, error, "An error occurred.");
    }
  };

  const fetchUserRoleAndImage = async (id) => {
    const [result] = await executeQuery("SELECT role, image FROM users WHERE id = ?", [id]);
    return result || null;
  };
  
  const fetchUserRole = async (id) => {
    const [result] = await executeQuery("SELECT role FROM users WHERE id = ?", [id]);
    return result || null;
  };
  const isRoleAuthorized = (dbUserRole, tokenUserRole) =>{
    return dbUserRole === tokenUserRole;
  }

  export  {
    handleResponse,
    validateUserId,
    handleRequest,
    isRoleAuthorized,
    fetchUserRole,
    fetchUserRoleAndImage
  }