import handleError from "../Utils/errorHandler.js";
import { Router } from "express";
import { HTTP_STATUS } from "../Utils/Helpers.js";
import { executeQuery, fetchOne } from "../Utils/dbHelper.js";

import {
  validateUpdateRent,
} from "../Validators/requestValidators.js";
// rents?fields=id,totalAmount&month=12&year=2024&status=confirmed&page=1&limit=10

const router = Router();
 
// Add a rent to a house
router.post("/book", async (req, res) => {
  const {
    tenantName,
    tenantEmail,
    startDate,
    endDate,
    status = "pending",
    notes,
    tenantId,
    ownerId,
    phone,
    houseId,
    cleaningPrice,
    pricePerDay, // Include pricePerDay in the request body
  } = req.body;

  try {
    // Check if the house exists
    const house = await fetchOne("SELECT * FROM houses WHERE id = ?", [
      houseId,
    ]);
    if (!house) {
      return res
        .status(HTTP_STATUS.NOT_FOUND)
        .json({ message: `House with ID ${houseId} not found.` });
    }

    // Verify tenant existence
    const tenant = await fetchOne("SELECT * FROM users WHERE id = ?", [
      tenantId,
    ]);
    if (!tenant) {
      return res
        .status(HTTP_STATUS.NOT_FOUND)
        .json({ message: `Tenant with ID ${tenantId} not found.` });
    }

    // Verify owner existence
    const owner = await fetchOne("SELECT * FROM users WHERE id = ?", [ownerId]);
    if (!owner) {
      return res
        .status(HTTP_STATUS.NOT_FOUND)
        .json({ message: `Owner with ID ${ownerId} not found.` });
    }

    // Calculate the number of days between startDate and endDate
    const daysNumber = Math.ceil(
      (new Date(endDate) - new Date(startDate)) / (1000 * 3600 * 24),
    );

    if (daysNumber <= 0) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json({ message: "The booking period must be at least one day." });
    }

    // Calculate the amount as pricePerDay * daysNumber
    const amount = pricePerDay * daysNumber;

    // Calculate the total amount as amount + cleaningPrice
    const totalAmount = amount + cleaningPrice;

    // Insert the rent into the rents table
    const insertRentQuery = `
      INSERT INTO rents (amount, tenantName, tenantEmail, startDate, endDate, status, notes, tenantId, ownerId, phone, daysNumber, houseId, cleaningPrice, pricePerDay, totalAmount)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `;
    const rentValues = [
      amount,
      tenantName,
      tenantEmail,
      startDate,
      endDate,
      status,
      notes,
      tenantId,
      ownerId,
      phone,
      daysNumber,
      houseId,
      cleaningPrice,
      pricePerDay,
      totalAmount, // Include totalAmount in the insert
    ];
    const result = await executeQuery(insertRentQuery, rentValues);

    // Get the last inserted ID
    const rentId = result.insertId;

    // Fetch the inserted rent details
    const rent = await fetchOne("SELECT * FROM rents WHERE id = ?", [rentId]);

    res.status(HTTP_STATUS.CREATED).json({
      message: "Rent added successfully",
      rent,
    });
  } catch (error) {
    if (error.message === "No results found.") {
      return res
        .status(HTTP_STATUS.NOT_FOUND)
        .json({ message: "Error: One or more entities not found in the db." });
    }
    handleError(
      res,
      error,
      "Error adding rent",
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
    );
  }
});

// Update a rent
router.put("/:houseId/rents/:rentId", validateUpdateRent, async (req, res) => {
  const { houseId, rentId } = req.params;

  // Validate request parameters
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

  try {
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
    const rent = await fetchOne("SELECT * FROM rents WHERE id = ?", [rentId]);
    if (!rent) {
      return res
        .status(HTTP_STATUS.NOT_FOUND)
        .json({ message: `Rent with ID ${rentId} not found.` });
    }

    // Check if the rent status is 'pending'
    if (rent.status !== "pending") {
      return res
        .status(HTTP_STATUS.FORBIDDEN)
        .json({
          message: "Cannot update rent because the status is not pending.",
        });
    }

    // Prepare the update query and values
    const updateFields = [];
    const updateValues = [];
    let newCleaningPrice =
      req.body.cleaningPrice !== undefined
        ? req.body.cleaningPrice
        : rent.cleaningPrice;

    // Calculate new start and end dates
    let newStartDate =
      req.body.startDate !== undefined ? req.body.startDate : rent.startDate;
    let newEndDate =
      req.body.endDate !== undefined ? req.body.endDate : rent.endDate;

    // Calculate the number of days between startDate and endDate
    const daysNumber = Math.ceil(
      (new Date(newEndDate) - new Date(newStartDate)) / (1000 * 3600 * 24),
    );

    if (daysNumber <= 0) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json({ message: "The booking period must be at least one day." });
    }

    // Recalculate amount
    const newPricePerDay =
      req.body.pricePerDay !== undefined
        ? req.body.pricePerDay
        : rent.pricePerDay;
    const amount = newPricePerDay * daysNumber; // amount is now calculated correctly
    const totalAmount = amount + newCleaningPrice; // totalAmount calculation

    // Update fields based on request body
    if (req.body.startDate !== undefined) {
      updateFields.push("startDate = ?");
      updateValues.push(newStartDate);
    }
    if (req.body.endDate !== undefined) {
      updateFields.push("endDate = ?");
      updateValues.push(newEndDate);
    }
    if (req.body.cleaningPrice !== undefined) {
      updateFields.push("cleaningPrice = ?");
      updateValues.push(newCleaningPrice);
    }
    // Always update the amount and totalAmount
    updateFields.push("amount = ?");
    updateValues.push(amount);
    updateFields.push("totalAmount = ?");
    updateValues.push(totalAmount);

    // Add other fields if they are provided
    const updates = ["status", "notes", "phone", "pricePerDay"];
    for (const field of updates) {
      if (req.body[field] !== undefined) {
        updateFields.push(`${field} = ?`);
        updateValues.push(req.body[field]);
      }
    }

    // Ensure that at least one field is being updated
    if (updateFields.length === 0) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json({ message: "No fields to update." });
    }

    // Add the rentId to the values for the update query
    updateValues.push(rentId);

    const updateRentQuery = `
      UPDATE rents
      SET ${updateFields.join(", ")}
      WHERE id = ?;
    `;
    await executeQuery(updateRentQuery, updateValues);

    // Fetch the updated rent details
    const updatedRent = await fetchOne("SELECT * FROM rents WHERE id = ?", [
      rentId,
    ]);

    res.status(HTTP_STATUS.OK).json({
      message: "Rent updated successfully",
      rent: updatedRent,
    });
  } catch (error) {
    if (error.message === "No results found.") {
      return res
        .status(HTTP_STATUS.NOT_FOUND)
        .json({ message: "Error: One or more entities not found." });
    }
    handleError(
      res,
      error,
      "Error updating rent",
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
    );
  }
});

 

export default router;
