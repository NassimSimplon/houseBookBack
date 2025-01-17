const mongoose = require("mongoose");

const RentSchema = new mongoose.Schema({
  amount: {
    type: Number,
    required: true,
  },
  startDate: {
    type: Date,
    required: true,
  },
  endDate: {
    type: Date,
    required: true,
  },
  daysNumber: {
    type: Number,
  },
  status: {
    type: String,
    enum: ["pending", "confirmed", "cancelled"],
    default: "pending",
  },
  notes: {
    type: String,
  },
  cleaningPrice:{
    type: Number
  },  phone: {
    type: String,
  },
  tenantName: {
    type: String,
    required: true,
  },
  tenantEmail: {
    type: String,
    required: true,
  },
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  houseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "House",
    required: true,
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
  pricePerDay:{
    type: Number
  },
  totalAmount:{
    type: Number
  }
});

const Rent = mongoose.model("Rent", RentSchema);

module.exports = Rent;
