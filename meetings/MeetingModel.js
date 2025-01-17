const mongoose = require("mongoose");
// MEETING SUB-SCHEMA
const MeetingSchema = new mongoose.Schema({
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users", // Reference to the users collection
      required: true,
    },
   
    date: {
      type: Date,
      required: true,
    },
  
    phone: {
      type: String,
    },
  
    subject: {
      type: String,
      required: true,
    },
    
    status: {
      type: String,
      enum: ["pending", "confirmed", "cancelled"],
      default: "pending",
    },
  });

const Meetings = mongoose.model("meetings", MeetingSchema);

module.exports = Meetings;
