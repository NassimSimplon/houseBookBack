import cPanelDb from "../Config/CpanelDb.js";

/**
 * Executes a query on the database with proper error handling.
 * @param {string} query - The SQL query to execute.
 * @param {Array} params - The parameters for the query.
 * @returns {Promise<Array>} - The results of the query.
 * @throws {Error} - Throws an error if the query fails.
 */
  async function executeQuery(query, params = []) {
    try {
      const [results] = await cPanelDb.promise().query(query, params);
      return results;
    } catch (error) {
      console.error("Database query error:", error.message);
      // Handle specific database errors
      if (error.code === "ER_BAD_FIELD_ERROR") {
        throw new Error("Invalid fields specified in the query.");
      } else if (error.code === "ER_PARSE_ERROR") {
        throw new Error("Syntax error in the query.");
      } else if (error.code === "ER_NO_SUCH_TABLE") {
        throw new Error("The specified table does not exist.");
      } else {
        throw new Error("Database error occurred.");
      }
    }
  }

  /**
  * Fetches a single result from the database with validation.
  * @param {string} query - The SQL query to execute.
  * @param {Array} params - The parameters for the query.
  * @returns {Promise<Object>} - The first result of the query.
  * @throws {Error} - Throws an error if no results are found.
  */
  async function fetchOne(query, params = []) {
    const results = await executeQuery(query, params);
    if (results.length === 0) {
      throw new Error("No results found.");
    }
    return results[0];
  }

export  { executeQuery, fetchOne };
