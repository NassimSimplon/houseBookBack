const mongoose = require("mongoose");
const Schema = mongoose.Schema;
// House Schema
const HouseSchema = new Schema({
  ownerID: {
    type: Number, 
  },
  ownerName: {
    type: String, 
  },
  postedBy   : {
    type: String,
    enum: ["admin" ,"owner",'subAdmin'],
    
    default: "admin",
  },
  images: [
    {
      type: String, // Assuming image URLs
     
    },
  ],
  houseType:{
    type: String,
  },
  weekendPrice:{
    type:Number
  },
  rentType:{
    type: String,
  },
  status: {
    type: String,
    enum: ["available", "rented", "blocked"],
    default: "available",
  },
  adminConfirmation: {
    type: String,
    enum: ["pending", "confirmed", "cancelled"],
    default: "pending",
  },
  description: {
    type: String,
    
  },
  pricePerDay:{
    type:Number,
    
  },
  address:{

    type:String,
    
  } , 
  country:{
    type:String,
  },
  street:{
    type:String,
  },
  ville:{
    type:String,
  },
  state:{
    type:String,
  },
  floor:{
    type:String,
  },
  zipCode:{
    type:Number,
  },
  latitude:{
    type:Number,
  },
  longitude:{
    type:Number,
  }
  ,
  created_at: {
    type: Date,
    default: Date.now, // Automatically set the current timestamp
  },
  note:{   type: String,
  },
  startDate: {
    type: Date,
    
  },
  endDate: {
    type: Date,
    
  },
  guests:{
type: Number,
  }
  ,
  bedrooms:{
type: Number,
  },
  
  beds:{
type: Number,
  }
  ,
  
  bathrooms:{
type: Number,
  } ,
  houseEquipments:[  {
    type: String, // Assuming image URLs
   
  },]
,  houseName: {
  type: String,
 
},
category:[  {
  type: String, // Assuming image URLs
 
},],
reservationType:{
  type: String, 
},
priceOverWeek:{
  type:Number
},
priceOverMonth:{
  type:Number
},
cleaningPriceShort:{
  type:Number
},
cleaningPriceLong:{
  type:Number
}
});

module.exports = mongoose.model("Houses", HouseSchema);
