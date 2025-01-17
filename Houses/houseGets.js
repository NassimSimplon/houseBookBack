import handleError from "../Utils/errorHandler.js";
import { Router } from "express";
import { HTTP_STATUS } from "../Utils/Helpers.js";
import { executeQuery } from "../Utils/dbHelper.js";

const router = Router();

function escapeString(str) {
  return str.replace(/'/g, "''");
}

router.get("/ville", async (req, res) => {
  try {
    const villeSearch = req.query.ville;
    const stateSearch = req.query.state;
    const fields = req.query.fields; // Fields parameter for user-specified fields

    let query;
    const values = [];

    if (fields) {
      const userFields = fields
        .split(",")
        .map(field => field.trim())
        .filter(field => field.length > 0); // Ensure valid fields are provided

      if (userFields.length === 0) {
        return res.status(400).json({ message: "Invalid fields parameter." });
      }

      if (userFields.length === 1) {
        // Single field: Use DISTINCT
        query = `SELECT DISTINCT ${userFields[0]} FROM houses;`;
      } else {
        // Multiple fields: Group by all specified fields
        const groupByClause = `GROUP BY ${userFields.join(", ")}`;
        query = `SELECT ${userFields.join(", ")} FROM houses ${groupByClause};`;
      }
    } else {
      // Default query logic for `villeSearch` and `stateSearch`
      let selectFields = "ville, MIN(id) AS id";
      let groupFields = "ville";
      let orderByFields = "ville";
      const conditions = [];

      if (stateSearch) {
        selectFields = "state, ville, MIN(id) AS id";
        groupFields = "state, ville";
        orderByFields = "state, ville";
        conditions.push("state LIKE ?");
        values.push(`%${escapeString(stateSearch)}%`);
      }

      if (villeSearch) {
        conditions.push("ville LIKE ?");
        values.push(`%${escapeString(villeSearch)}%`);
      }

      query = `SELECT ${selectFields} FROM houses`;

      if (conditions.length > 0) {
        query += " WHERE " + conditions.join(" AND ");
      }

      query += ` GROUP BY ${groupFields} ORDER BY ${orderByFields};`;
    }

    const result = await executeQuery(query, values);

    res.status(HTTP_STATUS.OK).json({
      message: "Data retrieved successfully.",
      data: result,
    });
  } catch (error) {
    console.error("Query error:", error.message, query);
    handleError(res, error, "Error retrieving data.");
  }
});


// GET ALL Houses
router.get("/", async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, parseInt(req.query.limit, 10) || 10);
    const offset = (page - 1) * limit;

    const fieldsParam = req.query.fields;
    const selectedFields = fieldsParam
      ? fieldsParam
          .split(",")
          .map((field) => field.trim())
          .join(", ")
      : "*";

    const filters = [];
    const values = [];
    Object.keys(req.query).forEach((key) => {
      if (!["page", "limit", "fields"].includes(key)) {
        filters.push(`${key} = ?`);
        values.push(req.query[key]);
      }
    });

    const filterQuery =
      filters.length > 0 ? `WHERE ${filters.join(" AND ")}` : "";
    const countQuery = `SELECT COUNT(*) AS total FROM houses ${filterQuery}`;
    const countResult = await executeQuery(countQuery, values);
    const totalHouses = countResult[0].total;

    const fetchHousesQuery = `
      SELECT ${selectedFields}
      FROM houses
      ${filterQuery}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?;
    `;
    const houses = await executeQuery(fetchHousesQuery, [
      ...values,
      limit,
      offset,
    ]);

    const totalPages = Math.ceil(totalHouses / limit);
    if (houses.length === 0) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        message: "No houses found.",
        houses: [],
        pagination: {
          totalHouses,
          totalPages,
          currentPage: page,
          limit,
        },
      });
    }

    res.status(HTTP_STATUS.OK).json({
      message: "Houses retrieved successfully.",
      houses,
      pagination: {
        totalHouses,
        totalPages,
        currentPage: page,
        limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    handleError(res, error, "Error retrieving houses.");
  }
});

// Get a specific house by ID
router.get("/:id", async (req, res) => {
  const { id } = req.params;
  if (isNaN(id)) {
    return res
      .status(HTTP_STATUS.BAD_REQUEST)
      .json({ message: "Invalid house ID format." });
  }

  try {
    const fieldsParam = req.query.fields;
    const selectedFields = fieldsParam
      ? fieldsParam
          .split(",")
          .map((field) => field.trim())
          .join(", ")
      : "*";
    const fetchHouseQuery = `SELECT ${selectedFields} FROM houses WHERE id = ?;`;
    const result = await executeQuery(fetchHouseQuery, [id]);
    if (result.length === 0) {
      return res
        .status(HTTP_STATUS.NOT_FOUND)
        .json({ message: "House not found." });
    }

    res.status(HTTP_STATUS.OK).json(result[0]);
  } catch (error) {
    console.error("Error fetching house:", error);
    handleError(res, error, "Error fetching house.");
  }
});

export default router;
