const mongoose = require("mongoose");

const RoomSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  description: String,

  image: {
      public_id: { type: String },
      url: { type: String },
    }, // filename of uploaded image

  pricePerNight: {
    type: Number,
    required: true,
  },
  maxGuests: {
    type: Number,
    required: true,
  },
  durationDays: Number, // duration of stay

  totalGuestsServed: Number,
  rating: Number,
  reviewsCount: Number,

  isFeatured: {
    type: Boolean,
    default: false,
  },

  amenities: [String], // array of strings

  extraService: {
    perBooking: Number,
    perPerson: Number,
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Room", RoomSchema);
