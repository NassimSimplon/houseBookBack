const mongoose = require("mongoose");

// SCHEMA
const Schema = mongoose.Schema;

// USERS MODEL
module.exports = mongoose.model(
  "users",
  new Schema({
    username: {
      type: String,
     
    },
    image: {
      type: String,
     
    },
    email: {
      type: String,
      unique: true,
      required: true,
    },
    Title: {
      type: String,
  
    },
    resetToken:{
      type: String,
    },

  phone: {
    type: String,
 
  },
    password: {
      type: String,
      required: true,
    },
    verified:{
      type: Boolean,
      default:false
    },
    verificationToken:{
      type: String,
      default:null
    },
    last_login:{
      type:Date,
      default:null
    },
    created_at:{
      type:Date,
      default:null
    },
    role: {
      type: String,
      enum: ["admin", "user","owner",'subAdmin'],
      required: true,
      default: "user",
    } 
  })
);
