import cPanelDb from "../Config/CpanelDb.js";
import jwt from "jsonwebtoken";
import env from '../Config/Dotenv.js';
// HTTP Status Codes
const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  FORBIDDEN: 403,         // Add Forbidden status
  NOT_FOUND: 404,         // Add Not Found status
  INTERNAL_SERVER_ERROR: 500,
};
// Load environment variables
const JWT_SECRET = env.JWT_SECRET || "NASSIM";

/**
 * Helper function to connect to the database
 */
const connectToDatabase = async () => {
   const connection = cPanelDb();
   return new Promise((resolve, reject) => {
     connection.connect((err) => {
       if (err) {
         reject(err);
       } else {
         resolve(connection);
       }
     });
   });
 };
 
 /**
  * Helper function to execute a query
  */
 const queryDatabase = (connection, query, params) => {
  return new Promise((resolve, reject) => {
    connection.query(query, params, (err, results) => {
      if (err) {
        // Wrap the error in an Error object
        reject(new Error(err.message || "Database query failed"));
      } else {
        resolve(results);
      }
    });
  });
};

 
/**
 * Utility function to generate a JWT token
 */
const generateToken = (payload, expiry) =>
  jwt.sign(payload, JWT_SECRET, { expiresIn: expiry });

 export   {
    HTTP_STATUS,
    connectToDatabase,
    queryDatabase,
    generateToken

 }