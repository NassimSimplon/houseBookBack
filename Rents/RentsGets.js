import handleError from "../Utils/errorHandler.js";
import { Router } from "express";
import { HTTP_STATUS } from "../Utils/Helpers.js";
import { executeQuery, fetchOne } from "../Utils/dbHelper.js";

// rents?fields=id,totalAmount&month=12&year=2024&status=confirmed&page=1&limit=10

const router = Router();

// Get ALL rents
router.get("/rents", async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const offset = (page - 1) * limit;

  // Extract query parameters
  const fields = req.query.fields
    ? req.query.fields.split(",").map((field) => field.trim())
    : [];
  const selectedFields = fields.length > 0 ? fields.join(", ") : "*";

  const month = parseInt(req.query.month, 10);
  const year = parseInt(req.query.year, 10);
  const status = req.query.status;
  const currentWeek = req.query.currentWeek === "true";
  const checkIn = req.query.checkIn === "true";
  const checkOut = req.query.checkOut === "true";

  try {
    // Base queries
    let totalRentsQuery = "SELECT COUNT(*) AS total FROM rents";
    let rentsQuery = `SELECT ${selectedFields} FROM rents`;

    const totalParams = [];
    const rentsParams = [];

    // Dynamic filters   
    if (month && year) {
      if (checkIn) {
        totalRentsQuery +=
          " WHERE YEAR(startDate) = ? AND MONTH(startDate) = ?";
        rentsQuery += " WHERE YEAR(startDate) = ? AND MONTH(startDate) = ?";
        totalParams.push(year, month);
        rentsParams.push(year, month);
      }

      if (checkOut) {
        if (!checkIn) {
          totalRentsQuery += " WHERE";
          rentsQuery += " WHERE";
        } else {
          totalRentsQuery += " AND";
          rentsQuery += " AND";
        }
        totalRentsQuery += " YEAR(endDate) = ? AND MONTH(endDate) = ?";
        rentsQuery += " YEAR(endDate) = ? AND MONTH(endDate) = ?";
        totalParams.push(year, month);
        rentsParams.push(year, month);
      }
    }

    if (currentWeek) {
      const today = new Date();
      const nextWeekDate = new Date();
      nextWeekDate.setDate(today.getDate() + 7);
      const startOfWeek = today.toISOString().split("T")[0];
      const endOfWeek = nextWeekDate.toISOString().split("T")[0];

      if (checkIn) {
        totalRentsQuery += totalParams.length ? " AND" : " WHERE";
        rentsQuery += rentsParams.length ? " AND" : " WHERE";
        totalRentsQuery += " startDate BETWEEN ? AND ?";
        rentsQuery += " startDate BETWEEN ? AND ?";
        totalParams.push(startOfWeek, endOfWeek);
        rentsParams.push(startOfWeek, endOfWeek);
      }

      if (checkOut) {
        totalRentsQuery += totalParams.length ? " AND" : " WHERE";
        rentsQuery += rentsParams.length ? " AND" : " WHERE";
        totalRentsQuery += " endDate BETWEEN ? AND ?";
        rentsQuery += " endDate BETWEEN ? AND ?";
        totalParams.push(startOfWeek, endOfWeek);
        rentsParams.push(startOfWeek, endOfWeek);
      }
    }

    if (status) {
      totalRentsQuery += totalParams.length ? " AND" : " WHERE";
      rentsQuery += rentsParams.length ? " AND" : " WHERE";
      totalRentsQuery += " status = ?";
      rentsQuery += " status = ?";
      totalParams.push(status);
      rentsParams.push(status);
    }

    // Execute total rents query
    const { total } = await fetchOne(totalRentsQuery, totalParams);

    if (total === 0) {
      return res.status(HTTP_STATUS.OK).json({
        message: "No rents found.",
        rents: [],
        pagination: {
          totalRents: total,
          currentPage: page,
          totalPages: 0,
          remainingPages: 0,
        },
      });
    }

    // Execute rents query with pagination
    rentsQuery += " ORDER BY startDate DESC LIMIT ? OFFSET ?";
    rentsParams.push(limit, offset);

    const rents = await executeQuery(rentsQuery, rentsParams);

    res.status(HTTP_STATUS.OK).json({
      message: "Rents retrieved successfully",
      rents,
      pagination: {
        totalRents: total,
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        remainingPages: Math.max(0, Math.ceil(total / limit) - page),
      },
    });
  } catch (error) {
    handleError(
      res,
      error,
      "Error retrieving rents",
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
    );
  }
});

// Get ALL rents by houseId
router.get("/:houseId/rents", async (req, res) => {
  const { houseId } = req.params;
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const offset = (page - 1) * limit;

  // Extract query parameters
  const fields = req.query.fields
    ? req.query.fields.split(",").map((field) => field.trim())
    : [];
  const selectedFields = fields.length > 0 ? fields.join(", ") : "*";

  const month = parseInt(req.query.month, 10);
  const year = parseInt(req.query.year, 10);
  const status = req.query.status;
  const currentWeek = req.query.currentWeek === "true";
  const checkIn = req.query.checkIn === "true";
  const checkOut = req.query.checkOut === "true";

  try {
    // Check if house exists
    const house = await fetchOne("SELECT * FROM houses WHERE id = ?", [
      houseId,
    ]);
    if (!house) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        message: `House with ID ${houseId} not found.`,
      });
    }

    // Base queries
    let totalRentsQuery =
      "SELECT COUNT(*) AS total FROM rents WHERE houseId = ?";
    let rentsQuery = `SELECT ${selectedFields} FROM rents WHERE houseId = ?`;

    const totalParams = [houseId];
    const rentsParams = [houseId];

    // Dynamic filters
    if (month && year) {
      if (checkIn) {
        totalRentsQuery += " AND YEAR(startDate) = ? AND MONTH(startDate) = ?";
        rentsQuery += " AND YEAR(startDate) = ? AND MONTH(startDate) = ?";
        totalParams.push(year, month);
        rentsParams.push(year, month);
      }

      if (checkOut) {
        totalRentsQuery += " AND YEAR(endDate) = ? AND MONTH(endDate) = ?";
        rentsQuery += " AND YEAR(endDate) = ? AND MONTH(endDate) = ?";
        totalParams.push(year, month);
        rentsParams.push(year, month);
      }
    }

    if (currentWeek) {
      const today = new Date();
      const nextWeekDate = new Date();
      nextWeekDate.setDate(today.getDate() + 7);
      const startOfWeek = today.toISOString().split("T")[0];
      const endOfWeek = nextWeekDate.toISOString().split("T")[0];

      if (checkIn) {
        totalRentsQuery += " AND startDate BETWEEN ? AND ?";
        rentsQuery += " AND startDate BETWEEN ? AND ?";
        totalParams.push(startOfWeek, endOfWeek);
        rentsParams.push(startOfWeek, endOfWeek);
      }

      if (checkOut) {
        totalRentsQuery += " AND endDate BETWEEN ? AND ?";
        rentsQuery += " AND endDate BETWEEN ? AND ?";
        totalParams.push(startOfWeek, endOfWeek);
        rentsParams.push(startOfWeek, endOfWeek);
      }
    }

    if (status) {
      totalRentsQuery += " AND status = ?";
      rentsQuery += " AND status = ?";
      totalParams.push(status);
      rentsParams.push(status);
    }

    // Execute total rents query
    const { total } = await fetchOne(totalRentsQuery, totalParams);

    if (total === 0) {
      return res.status(HTTP_STATUS.OK).json({
        message: "No rents found for this house.",
        rents: [],
        pagination: {
          totalRents: total,
          currentPage: page,
          totalPages: 0,
          remainingPages: 0,
        },
      });
    }

    // Execute rents query with pagination
    rentsQuery += " ORDER BY startDate DESC LIMIT ? OFFSET ?";
    rentsParams.push(limit, offset);

    const rents = await executeQuery(rentsQuery, rentsParams);

    res.status(HTTP_STATUS.OK).json({
      message: "Rents retrieved successfully",
      rents,
      pagination: {
        totalRents: total,
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        remainingPages: Math.max(0, Math.ceil(total / limit) - page),
      },
    });
  } catch (error) {
    handleError(
      res,
      error,
      "Error retrieving rents",
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
    );
  }
});
 
 
//GET ONE RENT BY ID
router.get("/:houseId/rents/:rentId", async (req, res) => {
  const { houseId, rentId } = req.params;

  try {
    // Validate houseId and rentId
    if (!houseId || isNaN(houseId)) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json({ message: "Invalid or missing houseId parameter." });
    }
    if (!rentId || isNaN(rentId)) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json({ message: "Invalid or missing rentId parameter." });
    }

    // Check if the house exists
    const house = await fetchOne("SELECT * FROM houses WHERE id = ?", [
      houseId,
    ]);
    if (!house) {
      return res
        .status(HTTP_STATUS.NOT_FOUND)
        .json({ message: `House with ID ${houseId} not found.` });
    }

    // Check if the rent exists
    const rent = await fetchOne(
      "SELECT * FROM rents WHERE id = ? AND houseId = ?",
      [rentId, houseId],
    );
    if (!rent) {
      return res
        .status(HTTP_STATUS.NOT_FOUND)
        .json({
          message: `Rent with ID ${rentId} not found for house ID ${houseId}.`,
        });
    }

    // Return the found rent
    res.status(HTTP_STATUS.OK).json({
      message: "Rent retrieved successfully",
      rent,
    });
  } catch (error) {
    console.error("Error retrieving rent:", error); // Log error details for debugging
    handleError(
      res,
      error,
      "Error retrieving rent",
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
    );
  }
});

export default router;
