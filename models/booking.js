const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    checkInDate: {
      type: Date,
      required: true,
    },
    checkOutDate: {
      type: Date,
      required: true,
    },
    guestCount: {
      type: Number,
      required: true,
    },
    extras: [
      {
        name: { type: String },
        price: { type: Number },
        type: { type: String }, // "per_booking" or "per_person"
      },
    ],
    totalAmount: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "confirmed", "cancelled","checked-in"],
      default: "pending",
    },

    // New fields for payment
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending",
    },
    paymentMethod: {
      type: String,
      enum: ["online", "offline"], // aapke system ke hisab se
      default: "online",
    },
    paymentId: {
      type: String, // payment gateway se milne wala unique payment id
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Booking", bookingSchema);
