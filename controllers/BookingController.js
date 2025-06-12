const BookingModel = require("../models/booking");
const booking = require("../models/booking");
const RoomModel = require("../models/room");
const Razorpay = require("razorpay");
const crypto = require("crypto");
const PDFDocument = require("pdfkit");
const UserModel = require("../models/user")

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// const BookingModel = require("../models/Booking")
class BookingController {
  static userBookingDisplay = async (req, res) => {
    try {
      const user = await UserModel.findById(req.user.id)
      const booking = await BookingModel.find({ user: req.user.id })
        .populate("room")
        .populate("user") // to get room details
        .sort({ _id: -1 });
      // console.log(booking)
      res.render("booking/userBookingDisplay", {
        std: booking,
        name: req.user.name,
        user,
        bookings: booking,
        error: req.flash("error"),
        success: req.flash("success"),
      });
    } catch (err) {
      console.log(err);
    }
  };

  // static insertBooking = async(req,res)=>{
  //     try{
  //         // console.log(req.body)
  //         const{
  //             user,
  //             room,
  //             checkIn,
  //             checkOut,
  //         } = req.body;
  //         const exisitingBooking = await booking.findOne({room})
  //         if(exisitingBooking){
  //             req.flash("error","Room already Booked")
  //             return res.redirect("/booking/display")
  //         }
  //         // const hashPassword = await bcrypt.hash(password,10)
  //         const result = await BookingModel.create({
  //             user,
  //             room,
  //             checkIn,
  //             checkOut,
  //         })
  //         req.flash("success","Room Booked Successfully")
  //         return res.redirect("/booking/display")
  //     }
  //     catch(err){
  //         console.log(err)
  //     }
  // }

  // static insertBooking = async (req, res) => {
  //   try {
  //       console.log(req.body)
  //     const {
  //           checkin,
  //           checkout,
  //           guests,
  //           addServicePerBooking,
  //           addServicePerPerson,
  //           totalPrice
  //       } = req.body;

  //      const result = await BookingModel.create({
  //           checkin,
  //           checkout,
  //           guests,
  //           addServicePerBooking: addServicePerBooking || false,
  //           addServicePerPerson: addServicePerPerson || false,
  //           totalPrice
  //       });

  //   //   console.log("Booking inserted successfully:", result);
  //     res.status(201).json({
  //       message: "Booking created successfully",
  //       booking: savedBooking,
  //     });
  //   } catch (error) {
  //     // console.error('❌ Error inserting booking:', error);
  //     // throw error;
  //     console.log(erro);
  //   }
  // };

  static insertBooking = async (req, res) => {
    try {
      // console.log(req.body);
      const userId = req.user._id;
      const {
        roomId,
        checkin,
        checkout,
        guests,
        select01,
        select02,
        pricePerNight,
        extraPerBooking,
        extraPerPerson,
      } = req.body;

      const room = await RoomModel.findById(roomId);
      // if (!room || !room.isAvailable) {
      //   req.flash("error", "Room not available");
      //   return res.redirect("/rooms");
      // }

      const extras = [];
      if (select01 === "on") {
        extras.push({
          name: "Extra per Booking",
          price: parseFloat(extraPerBooking),
          type: "per_booking",
        });
      }
      if (select02 === "on") {
        extras.push({
          name: "Extra per Person",
          price: parseFloat(extraPerPerson),
          type: "per_person",
        });
      }

      const checkInDate = new Date(checkin);
      const checkOutDate = new Date(checkout);
      const guestCount = parseInt(guests);
      const nights = Math.ceil(
        (checkOutDate - checkInDate) / (1000 * 60 * 60 * 24)
      );
      let total = parseFloat(pricePerNight) * nights;

      extras.forEach((extra) => {
        total += extra.price * (extra.type === "per_person" ? guestCount : 1);
      });

      // 1. Save pending booking
      const booking = new BookingModel({
        room: roomId,
        user: req.user.id,
        checkInDate,
        checkOutDate,
        guestCount,
        extras,
        totalAmount: total,
        status: "pending",
        paymentStatus: "pending",
      });
      await booking.save(); // Yahan pe sahi save

      // Increment totalBookings
      await UserModel.findByIdAndUpdate(userId, {
        $inc: { totalBookings: 1 },
      });

      // 2. Create Razorpay order
      const order = await razorpay.orders.create({
        amount: Math.round(total * 100), // paise mein convert karo (integer)
        currency: "INR",
        receipt: booking._id.toString(),
      });

      // 3. Save Razorpay order ID in booking
      booking.razorpayOrderId = order.id;
      await booking.save();

      // 4. Render payment page with order details
      res.render("payment", {
        key: process.env.RAZORPAY_KEY_ID,
        order,
        booking,
      });
    } catch (error) {
      console.log(error);
    }
  };

  static verifyPayment = async (req, res) => {
    try {
      // console.log(req.body);
      const {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        bookingId,
      } = req.body;

      const booking = await BookingModel.findById(bookingId).populate("room");
      if (!booking) {
        // Booking not found
        return res.render("paymentResult", {
          success: false,
          message: "Booking not found.",
        });
      }

      // Signature validation
      const generated_signature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
        .update(razorpay_order_id + "|" + razorpay_payment_id)
        .digest("hex");

      if (generated_signature === razorpay_signature) {
        booking.paymentStatus = "paid";
        booking.status = "confirmed";
        booking.razorpayPaymentId = razorpay_payment_id;
        await booking.save();

        // Payment success — render confirmation page with booking details
        return res.render("paymentResult", {
          success: true,
          booking,
          message: "Payment successful! Your booking is confirmed.",
        });
      } else {
        // Invalid signature
        return res.render("paymentResult", {
          success: false,
          message: "Payment verification failed.",
        });
      }
    } catch (error) {
      console.error(error);
      return res.render("paymentResult", {
        success: false,
        message: "Internal server error.",
      });
    }
  };
  static cancelBooking = async (req, res) => {
    try {
      const booking = await BookingModel.findOne({
        _id: req.params.id,
        user: req.user.id,
      });

      if (!booking) {
        req.flash("error", "Booking not found.");
        return res.redirect("/user/bookings");
      }

      booking.status = "cancelled";
      booking.paymentStatus = "refunded"; // optional
      await booking.save();

      req.flash("success", "Your booking has been cancelled successfully.");
      res.redirect("/user/bookings");
    } catch (err) {
      console.error("Cancellation Error:", err);
      req.flash("error", "Something went wrong while cancelling the booking.");
      res.redirect("/user/bookings");
    }
  };

  static downloadInvoice = async (req, res) => {
    try {
      const booking = await BookingModel.findOne({
        _id: req.params.id,
        user: req.user.id,
      }).populate("room");

      if (!booking) return res.status(404).send("Booking not found");

      const doc = new PDFDocument({ margin: 50 });

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=invoice-${booking._id}.pdf`
      );
      doc.pipe(res);

      // === Header ===
      doc
        .fillColor("#333")
        .fontSize(26)
        .text("PNINFOSYS HOTEL", { align: "center" })
        .moveDown(0.5);

      doc
        .fontSize(16)
        .fillColor("#666")
        .text("Hotel Booking Invoice", { align: "center" })
        .moveDown();

      // === Booking Info Table ===
      doc
        .fontSize(12)
        .fillColor("#000")
        .text(`Invoice Date: ${new Date().toDateString()}`)
        .text(`Booking ID: ${booking._id}`)
        .text(`User Name: ${req.user.name}`)
        .moveDown();

      doc
        .fillColor("#005f99")
        .fontSize(14)
        .text("Booking Details", { underline: true })
        .moveDown(0.5);

      doc
        .fontSize(12)
        .fillColor("#000")
        .text(`Room: ${booking.room.title}`)
        .text(`Check-in: ${booking.checkInDate.toDateString()}`)
        .text(`Check-out: ${booking.checkOutDate.toDateString()}`)
        .text(`Guests: ${booking.guestCount}`)
        .moveDown();

      // === Price Section ===
      doc
        .fillColor("#005f99")
        .fontSize(14)
        .text("Payment Summary", { underline: true })
        .moveDown(0.5);

      doc
        .fontSize(12)
        .fillColor("#000")
        .text(`Total Paid: ₹${booking.totalAmount.toFixed(2)}`)
        .text(`Status: ${booking.status.toUpperCase()}`)
        .moveDown();

      // === Footer ===
      doc
        .fontSize(10)
        .fillColor("#888")
        .text("Thank you for booking with PNINFOSYS Hotel!", {
          align: "center",
          lineGap: 6,
        });

      doc.end();
    } catch (err) {
      console.log("Invoice error:", err);
      res.status(500).send("Internal Server Error");
    }
  };

  static changeBookingStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    try {
      await BookingModel.findByIdAndUpdate(id, { status });
      req.flash("success", `Your Booking status successfully Changed`);
      res.redirect("/admin/bookings"); // Redirects to the same page
    } catch (err) {
      console.error("Error updating booking status:", err);
      res.status(500).send("Error updating booking status");
    }
  };
}

module.exports = BookingController;
