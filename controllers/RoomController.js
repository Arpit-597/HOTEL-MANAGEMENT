const path = require("path");
const fs = require("fs");
const Room = require("../models/room");
const cloudinary = require("cloudinary");
const ReviewModel = require("../models/reviews");
const ReplyModel = require("../models/reply"); // Add this import
const UserModel = require("../models/user");
//setup
cloudinary.config({
  cloud_name: process.env.cloudinary_name,
  api_key: process.env.cloudinary_api_key,
  api_secret: process.env.cloudinary_api_secret,
});

class RoomController {
  static display = async (req, res) => {
    const Rooms = await Room.find().sort({ _id: -1 });
    try {
      // console.log(student)
      res.render("rooms/display", {
        error: req.flash("error"),
        success: req.flash("success"),
        rooms: Rooms,
      });
    } catch (error) {
      console.log(err);
    }
  };

  static list = async (req, res) => {
    try {
      const rooms = await Room.find();
      res.render("rooms/list", { rooms });
    } catch (error) {
      console.log(error);
    }
  };

  static addForm = async (req, res) => {
    try {
      res.render("rooms/add");
    } catch (error) {
      console.log(error);
    }
  };

  static addRoom = async (req, res) => {
    try {
      // console.log(req.files);
      const {
        title,
        description,
        pricePerNight,
        maxGuests,
        durationDays,
        totalGuestsServed,
        rating,
        reviewsCount,
        isFeatured,
        amenities,
        extraPerBooking,
        extraPerPerson,
      } = req.body;
      // console.log(req.body)

      //image upload
      const file = req.files.image;
      const imageUpload = await cloudinary.uploader.upload(file.tempFilePath, {
        folder: "room_images",
      });
      // console.log(imageUpload);

      let image = "";
      if (req.file) image = req.file.filename;

      const room = new Room({
        title,
        description,
        image: {
          public_id: imageUpload.public_id,
          url: imageUpload.secure_url,
        },
        pricePerNight,
        maxGuests,
        durationDays,
        totalGuestsServed,
        rating,
        reviewsCount,
        isFeatured: isFeatured === "on",
        amenities: amenities.split(",").map((i) => i.trim()),
        extraService: {
          perBooking: extraPerBooking,
          perPerson: extraPerPerson,
        },
      });

      await room.save();
      req.flash("success", "Room Added Successfully");
      res.redirect("/rooms/display");
    } catch (err) {
      console.log(err);
    }
  };

  static editForm = async (req, res) => {
    try {
      const room = await Room.findById(req.params.id);
      res.render("rooms/edit", { room });
    } catch (error) {
      console.log(error);
    }
  };

  static updateRoom = async (req, res) => {
    try {
      const id = req.params.id;
      // console.log(id)
      const {
        title,
        description,
        pricePerNight,
        maxGuests,
        durationDays,
        totalGuestsServed,
        rating,
        reviewsCount,
        isFeatured,
        amenities,
        extraPerBooking,
        extraPerPerson,
        // image
      } = req.body;

      if (req.files) {
        const room = await Room.findById(id);
        const imageID = room.image.public_id;

        //delete image from cloudinary
        if (room.image && room.image.public_id) {
          await cloudinary.uploader.destroy(imageID);
        }

        //new image update
        const imageFile = req.files.image;
        const imageupload = await cloudinary.uploader.upload(
          imageFile.tempFilePath,
          {
            folder: "room_images",
          }
        );

        var data = {
          title,
          description,
          pricePerNight,
          maxGuests,
          durationDays,
          totalGuestsServed,
          rating,
          reviewsCount,
          isFeatured,
          amenities,
          extraPerBooking,
          extraPerPerson,
          image: {
            public_id: imageupload.public_id,
            url: imageupload.url,
          },
        };
      } else {
        var data = {
          title,
          description,
          pricePerNight,
          maxGuests,
          durationDays,
          totalGuestsServed,
          rating,
          reviewsCount,
          isFeatured,
          amenities,
          extraPerBooking,
          extraPerPerson,
        };
      }

      await Room.findByIdAndUpdate(id, data);
      req.flash("success", "Room Details Uploaded Successfully");
      return res.redirect("/rooms/display");
    } catch (error) {
      console.log(error);
    }
  };

  static deleteRoom = async (req, res) => {
    try {
      const id = req.params.id;
      await Room.findByIdAndDelete(id);
      req.flash("success", "Room Deleted Successfully");
      res.redirect("/rooms/display");
    } catch (error) {
      console.log(error);
    }
  };
  // GET /roomView/:id
  static viewRoom = async (req, res) => {
    try {
      const room = await Room.findById(req.params.id);
      // if (!room) return res.status(404).send("Room not found");
      res.render("rooms/view", { room }); // Adjust path as per your setup
    } catch (error) {
      console.error(error);
      // res.status(500).send("Server error");
    }
  };

  static addReviews = async (req, res) => {
    try {
      const {
        name,
        email,
        message,
        serviceRating,
        locationRating,
        amenitiesRating,
        pricesRating,
        foodRating,
        roomId, // Get from form
      } = req.body;

      if (!req.user) {
        return res.redirect(`/detailsRoom/${roomId}?error=unauthorized`);
      }

      // console.log(req.user)

      const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);

      const existingReview = await ReviewModel.findOne({
        email: email,
        roomId: roomId,
        message: message,
        createdAt: { $gte: twoMinutesAgo },
      });

      if (existingReview) {
        console.log("Duplicate review detected, redirecting...");
        return res.redirect(`/detailsRoom/${roomId}?error=duplicate`);
      }

      const userImage = req.user?.image || "/assets/images/default-avatar.png";

      await ReviewModel.create({
        userId: req.user.id,
        name,
        email,
        message,
        serviceRating: parseInt(serviceRating) || 1,
        locationRating: parseInt(locationRating) || 1,
        amenitiesRating: parseInt(amenitiesRating) || 1,
        pricesRating: parseInt(pricesRating) || 1,
        foodRating: parseInt(foodRating) || 1,
        userImage,
        roomId,
      });

      // console.log("User ID for totalReviews increment:", req.user.id);

      // Increment totalReviews
      await UserModel.findByIdAndUpdate(req.user.id, {
        $inc: { totalReviews: 1 },
      },{ new: true });

      // Redirect to the room detail page
      res.redirect(`/detailsRoom/${roomId}`);
    } catch (err) {
      console.log(err);
    }
  };

  // Method to add a reply to a review
  static addReply = async (req, res) => {
    try {
      const { reviewId, message } = req.body;
      const userId = req.user.id;

      // Get user details
      const user = await UserModel.findById(userId);

      const reply = new ReplyModel({
        reviewId,
        userId,
        name: user.name,
        email: user.email,
        message,
      });

      await reply.save();

      res.json({
        success: true,
        message: "Reply added successfully",
        reply: {
          ...reply.toObject(),
          userId: { name: user.name, image: user.image },
        },
      });
    } catch (error) {
      console.log(error);
      res.json({
        success: false,
        message: "Failed to add reply",
      });
    }
  };

  // Method to get replies for a specific review
  static getReplies = async (req, res) => {
    try {
      const reviewId = req.params.reviewId;
      const limit = parseInt(req.query.limit) || 3; // Get latest 3 replies by default

      const replies = await ReplyModel.find({ reviewId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate("userId", "name image");

      res.json({
        success: true,
        replies,
      });
    } catch (error) {
      console.log(error);
      res.json({
        success: false,
        message: "Failed to fetch replies",
      });
    }
  };
}

module.exports = RoomController;
