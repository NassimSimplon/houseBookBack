import { body, validationResult } from "express-validator";

const maxLength = (field, length) => `${field} cannot exceed ${length} characters.`;
const decimalPlaces = (field, places) => `${field} must have at most ${places} decimal places.`;

const validateHouseReqData = [
  body("ownerID").isInt().withMessage("Owner ID must be an integer.").toInt(),
  body("ownerName").optional().isString().isLength({ max: 255 }).withMessage(maxLength("Owner name", 255)),
  body("postedBy").optional().isIn(["admin", "owner", "subAdmin"]).withMessage("Posted by must be one of the allowed values."),
  body("images").optional().isArray().custom(value => {
    if (value.length === 0) throw new Error("At least one image URL must be provided.");
    return true;
  }),
  body("houseType").optional().isString().isLength({ max: 255 }).withMessage(maxLength("House type", 255)),
  body("weekendPrice").optional().isDecimal({ decimal_digits: "0,2" }).withMessage(decimalPlaces("Weekend price", 2)),
  body("rentType").optional().isString().isLength({ max: 255 }).withMessage(maxLength("Rent type", 255)),
  body("status").optional().isIn(["available", "rented", "blocked"]).withMessage("Invalid status."),
  body("adminConfirmation").optional().isIn(["pending", "confirmed", "cancelled"]).withMessage("Invalid admin confirmation."),
  body("description").optional().isString().isLength({ max: 65535 }).withMessage(maxLength("Description", 65535)),
  body("pricePerDay").optional().isDecimal({ decimal_digits: "0,2" }).withMessage(decimalPlaces("Price per day", 2)),
  body("address").optional().isString().isLength({ max: 255 }).withMessage(maxLength("Address", 255)),
  body("country").optional().isString().isLength({ max: 255 }).withMessage(maxLength("Country", 255)),
  body("street").optional().isString().isLength({ max: 255 }).withMessage(maxLength("Street", 255)),
  body("ville").optional().isString().isLength({ max: 255 }).withMessage(maxLength("Ville", 255)),
  body("state").optional().isString().isLength({ max: 255 }).withMessage(maxLength("State", 255)),
  body("floor").optional().isString().isLength({ max: 255 }).withMessage(maxLength("Floor", 255)),
  body("zipCode").optional().isInt().withMessage("Zip code must be an integer.").toInt(),
  body("latitude").optional().isDecimal({ decimal_digits: "0,8" }).withMessage(decimalPlaces("Latitude", 8)),
  body("longitude").optional().isDecimal({ decimal_digits: "0,8" }).withMessage(decimalPlaces("Longitude", 8)),
  body("note").optional().isString().isLength({ max: 65535 }).withMessage(maxLength("Note", 65535)),
  body("startDate").optional().isISO8601().withMessage("Start date must be a valid ISO 8601 date."),
  body("endDate").optional().isISO8601().withMessage("End date must be a valid ISO 8601 date."),
  body("guests").optional().isInt().withMessage("Guests must be an integer."),
  body("bedrooms").optional().isInt().withMessage("Bedrooms must be an integer."),
  body("beds").optional().isInt().withMessage("Beds must be an integer."),
  body("bathrooms").optional().isInt().withMessage("Bathrooms must be an integer."),
  body("houseEquipments").optional().isArray().withMessage("House equipments must be an array."),
  body("houseName").optional().isString().isLength({ max: 255 }).withMessage(maxLength("House name", 255)),
  body("category").optional().isArray().withMessage("Category must be an array."),
  body("reservationType").optional().isString().isLength({ max: 255 }).withMessage(maxLength("Reservation type", 255)),
  body("priceOverWeek").optional().isDecimal({ decimal_digits: "0,2" }).withMessage(decimalPlaces("Price over week", 2)),
  body("priceOverMonth").optional().isDecimal({ decimal_digits: "0,2" }).withMessage(decimalPlaces("Price over month", 2)),
  body("cleaningPriceShort").optional().isDecimal({ decimal_digits: "0,2" }).withMessage(decimalPlaces("Cleaning price (short)", 2)),
  body("cleaningPriceLong").optional().isDecimal({ decimal_digits: "0,2" }).withMessage(decimalPlaces("Cleaning price (long)", 2)),

  // Check for validation errors
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
];
const validateUserReqData = [
  body("username").isString().isLength({ max: 255 }).withMessage(maxLength("Username", 255)),
  body("image").optional().isString().isLength({ max: 255 }).withMessage(maxLength("Image", 255)),
  body("email").isEmail().withMessage("Email must be a valid email address.").normalizeEmail(),
  body("Title").optional().isString().isLength({ max: 255 }).withMessage(maxLength("Title", 255)),
  body("resetToken").optional().isString().withMessage("Reset token must be a string."),
  body("phone").isString().isLength({ max: 20 }).withMessage(maxLength("Phone", 20)), // Assuming phone number length limit
  body("password").isString().isLength({ min: 8 }).withMessage("Password must be at least 8 characters long."),
  body("verified").optional().isBoolean().withMessage("Verified must be a boolean."),
  body("verificationToken").optional().isString().withMessage("Verification token must be a string."),
  body("role").optional().isIn(["admin", "user", "owner", "subAdmin"]).withMessage("Role must be one of the allowed values."),
  
  // Check for validation errors
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
];

const validateRent = [
  body("amount")
  .optional().isNumeric().withMessage("Amount must be a number.")
    .isFloat({ gt: 0 }).withMessage("Amount must be greater than 0."),
  
  body("tenantName")
  .isString().withMessage("Tenant Name must be a string.")
    .notEmpty().withMessage("Tenant Name is required."),
  
  body("tenantEmail")
  .isEmail().withMessage("Tenant Email must be a valid email address.")
    .notEmpty().withMessage("Tenant Email is required."),
  
  body("tenantId")
    .isMongoId().withMessage("Invalid Tenant ID format.")
    .notEmpty().withMessage("Tenant ID is required."),
  
  body("ownerId")
    .isMongoId().withMessage("Invalid Owner ID format.")
    .notEmpty().withMessage("Owner ID is required."),
  
  body("houseId")
    .isMongoId().withMessage("Invalid House ID format.")
    .notEmpty().withMessage("House ID is required."),
  
  body("startDate")
    .isISO8601().withMessage("Start Date must be a valid date in ISO 8601 format.")
    .toDate(),
  
  body("endDate")
    .isISO8601().withMessage("End Date must be a valid date in ISO 8601 format.")
    .toDate()
    .custom((value, { req }) => {
      if (new Date(value) <= new Date(req.body.startDate)) {
        throw new Error("End Date must be after Start Date.");
      }
      return true;
    }),

  body("phone")
    
    .isString().withMessage("Phone must be a string."),
  
  body("status")
    
  .optional().isIn(["pending", "confirmed", "cancelled"]).withMessage("Status must be one of: pending, confirmed, cancelled."),
  
  body("notes")
    
  .optional().isString().withMessage("Notes must be a string."),
  
  body("cleaningPrice")
    .optional()
    .isNumeric().withMessage("Cleaning Price must be a number.")
    .isFloat({ gte: 0 }).withMessage("Cleaning Price must be greater than or equal to 0."),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
];
 const validateUpdateRent = [
  body("amount")
  .optional().isNumeric().withMessage("Amount must be a number.")
    .isFloat({ gt: 0 }).withMessage("Amount must be greater than 0.")
    .notEmpty().withMessage("Amount is required."),

  body("startDate")
  .optional().isISO8601().withMessage("Start Date must be a valid date in ISO 8601 format.")
    .toDate()
    .notEmpty().withMessage("Start Date is required."),

  body("endDate")
  .optional() .isISO8601().withMessage("End Date must be a valid date in ISO 8601 format.")
    .toDate()
    .notEmpty().withMessage("End Date is required.")
    .custom((value, { req }) => {
      if (new Date(value) <= new Date(req.body.startDate)) {
        throw new Error("End Date must be after Start Date.");
      }
      return true;
    }), 

  body("status")
    .optional()
    .isIn(["pending", "confirmed", "cancelled"]).withMessage("Status must be one of: pending, confirmed, cancelled."),

  body("notes")
    .optional()
    .isString().withMessage("Notes must be a string."),

  body("cleaningPrice")
    .optional()
    .isNumeric().withMessage("Cleaning Price must be a number.")
    .isFloat({ gte: 0 }).withMessage("Cleaning Price must be greater than or equal to 0."),
    

  body("phone")
    .optional()
    .isString().withMessage("Phone must be a string."),
    (req, res, next) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      next();
    },
];


export  { validateHouseReqData ,validateUserReqData, validateRent,validateUpdateRent};
