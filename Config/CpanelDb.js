import { createPool } from "mysql2";

// const mysql = require('mysql2');

// // Create a connection pool
// const cPanelDb = () => {
//     return mysql.createConnection({
//         host: '10.10.10.10',
//         user: 'yxdgljyk_yxdgljyk',
//         password: 'Imed.nass123456',
//         database: 'yxdgljyk_houseBook' 
//     });
// };
// // Export the pool to use in other parts of your app
// module.exports = cPanelDb;
// import { createConnection } from 'mysql2';

// // Create a connection pool
// const cPanelDb = () => {
//     return createConnection({
//         host: 'localhost',
//         user: 'root', // Remove leading space
//         password: 'nassim123456',
//         database: 'nassim',
//         port: 3306
//     });
// };

// // Function to check the database connection
// const checkConnection = () => {
//     const connection = cPanelDb(); // Use the connection configuration

//     connection.connect((err) => {
//         if (err) {
//             console.error('Error connecting to the database: ❌', err);
//             return;
//         }
//         console.log('Connected to the MySQL database! ✅');

//         // Close the connection after checking
//         connection.end();
//     });
// };

// // Check the database connection
// checkConnection();
// // Export the pool to use in other parts of your app
// export default cPanelDb;

// Create a connection pool
const cPanelDb = createPool({
    host: 'localhost',
    user: 'root',
    password: 'nassim123456',
    database: 'nassim',
    port: 3306,
    waitForConnections: true,
    connectionLimit: 10, // Maximum number of connections in the pool
    queueLimit: 0       // Unlimited queueing
});

// Function to check the database connection
const checkConnection = () => {
    cPanelDb.getConnection((err, connection) => {
        if (err) {
            console.error('Error connecting to the database: ❌', err);
            return;
        }
        console.log('Connected to the MySQL database! ✅');
        
        // Release the connection back to the pool
        connection.release();
    });
};

// Check the database connection
checkConnection();

// Export the pool to use in other parts of your app
export default cPanelDb;
