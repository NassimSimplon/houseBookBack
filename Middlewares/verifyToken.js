import jwt from 'jsonwebtoken';
import env from '../Config/Dotenv.js';
const verifyToken = async (req, res, next) => {
    try {
        // Get the token from the Authorization header
        const token = req.header("Authorization")?.split(" ")[1];
        if (!token) {
            return res.status(401).json({ message: "Access token is missing!" });
        }
        
        // Verify the token
        const decoded = jwt.verify(token, env.JWT_SECRET);
        if (!decoded) {
            return res.status(401).json({ message: "Wrong Token !!" });
        }

        // Assign the decoded token to req.user
        req.user = decoded; // Add this line to set req.user

        next();
    } catch (error) {
        res.status(401).json({ message: "Invalid or expired token!", error: error.message });
    }
};

export default verifyToken;
