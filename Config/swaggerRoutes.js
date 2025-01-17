import express from "express";
import path from "path";
import swaggerUi from "swagger-ui-express";
import { loadSwaggerDocs } from "./swagger.js";

const router = express.Router();

// Load Swagger documentation for different API modules
const authDocs = loadSwaggerDocs(path.join(process.cwd(), 'swagger/auth'));
const userDocs = loadSwaggerDocs(path.join(process.cwd(), 'swagger/users'));
const houseDocs = loadSwaggerDocs(path.join(process.cwd(), 'swagger/houses'));

// Merge schemas from `users` into `auth`
authDocs.components.schemas = {
  ...authDocs.components.schemas,
  ...userDocs.components.schemas,
  ...houseDocs.components.schemas,
};

// Remove token authentication for authDocs
delete authDocs.components.securitySchemes; // Remove security schemes
Object.keys(authDocs.paths).forEach((path) => {
  Object.keys(authDocs.paths[path]).forEach((method) => {
    delete authDocs.paths[path][method].security; // Remove security requirement
  });
});
// Define a home route for Swagger UI
router.get('/', (req, res) => {
    res.send(`
      <html>
        <head>
          <title>API Documentation</title>
          <link rel="stylesheet" type="text/css" href="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.1.3/swagger-ui.css" />
          <style>
            body {
              font-family: Arial, sans-serif;
              background-color: #f4f4f4;
              margin: 0;
              padding: 20px;
              color: #333;
            }
            h1 {
              text-align: center;
              color: #007BFF;
              margin-bottom: 20px;
            }
            ul {
              list-style-type: none;
              padding: 0;
              display: flex;
              flex-direction: column;
              align-items: center;
            }
            li {
              margin: 10px 0;
            }
            a {
              text-decoration: none;
              padding: 10px 15px;
              background-color: #007BFF;
              color: white;
              border-radius: 5px;
              transition: background-color 0.3s;
            }
      
          </style>
          <script src="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.1.3/swagger-ui-bundle.js"></script>
        </head>
        <body>
          <h1>API Documentation</h1>
          <ul>
            <li><a href="/api-docs/auth">Authentication API</a></li>
            <li><a href="/api-docs/users">User API</a></li>
                        <li><a href="/api-docs/houses">Houses API</a></li>
          </ul>
        </body>
      </html>
    `);
});

// Define separate Swagger UI setups for each route
router.use('/auth', swaggerUi.serve, (req, res, next) => {
  swaggerUi.setup(authDocs, { explorer: true })(req, res, next);
});

router.use('/users', swaggerUi.serve, (req, res, next) => {
  swaggerUi.setup(userDocs, { explorer: true })(req, res, next);
});
router.use('/houses', swaggerUi.serve, (req, res, next) => {
  swaggerUi.setup(houseDocs, { explorer: true })(req, res, next);
});


export default router;
