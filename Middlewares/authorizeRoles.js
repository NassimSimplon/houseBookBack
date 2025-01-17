import jwt from "jsonwebtoken";
import env from '../Config/Dotenv.js';
// Middleware to authorize the user based on role
const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    const token = req.header("Authorization")?.split(" ")[1]; // Bearer token

    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    try {
      const decoded = jwt.verify(token, env.JWT_SECRET);
      // Set user data in req.user
      req.user = { id: decoded.id, role: decoded.role }; // Assuming id and role are saved in the token

      // Check the role
      const userRole = decoded.role;
      if (!roles.includes(userRole)) {
        return res.status(403).json({ message: "Access denied, You don't have the right permission" });
      }
      next(); // Proceed if user has one of the authorized roles
    } catch (error) {
      return res.status(401).json({ message: "Invalid token", error: error.message });
    }
  };
};

export default authorizeRoles;
