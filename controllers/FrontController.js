const ReviewsModel = require("../models/reviews");
const RoomModel = require("../models/room");
const UserModel = require("../models/user"); // Adjust path as needed
// Add this import at the top of your FrontController
const ReplyModel = require("../models/reply");
const bcrypt = require("bcrypt");

const allAmenities = [
  "Conditioning",
  "Lawn",
  "TV Cable",
  "Barbeque",
  "Microwave",
  "Washer",
  "Dryer",
  "Refrigerator",
  "WiFi",
  "Gym",
  "Sauna",
  "Window Coverings",
  "Laundry",
  "Swimming Pool",
];

const ratingmeasures = [
  "serviceRating",
  "locationRating",
  "amenitiesRating",
  "pricesRating",
  "foodRating",
];

class FrontController {
  static home = async (req, res) => {
    try {
      // res.send("home page")
      res.render("home");
    } catch (err) {
      console.log(err);
    }
  };

  static restaurant = async (req, res) => {
    try {
      // res.send("home page")
      res.render("restaurant");
    } catch (err) {
      console.log(err);
    }
  };

  static contact = async (req, res) => {
    try {
      // res.send("home page")
      res.render("contact");
    } catch (err) {
      console.log(err);
    }
  };

  static about = async (req, res) => {
    try {
      // res.send("home page")
      res.render("about");
    } catch (err) {
      console.log(err);
    }
  };

  static SignUp = async (req, res) => {
    try {
      // res.send("home page")
      res.render("SignUp", {
        error: req.flash("error"),
      });
    } catch (err) {
      console.log(err);
    }
  };

  static Login = async (req, res) => {
    try {
      // res.send("home page")
      res.render("Login", {
        success: req.flash("success"),
        error: req.flash("error"),
      });
    } catch (err) {
      console.log(err);
    }
  };

  static dashboard = async (req, res) => {
    try {
      // res.send("home page")
      res.render("dashboard", {
        success: req.flash("success"),
        error: req.flash("error"),
      });
    } catch (err) {
      console.log(err);
    }
  };

  // static RoomDetails = async (req, res) => {
  //   try {

  //     const room = await RoomModel.findById(req.params.id);
  //     const reviews = await ReviewsModel.find({ roomId: req.params.id }).sort({
  //       createdAt: -1,
  //     });

  //     let fullUser = null;
  //     if (req.user) {
  //       fullUser = await UserModel.findById(req.user.id); // fetch full user with image
  //     }

  //     res.render("rooms/room-details", {
  //       room,
  //       allAmenities,
  //       ratingmeasures,
  //       reviews,
  //       user: fullUser,
  //     });
  //   } catch (error) {
  //     console.log(error);
  //   }
  // };

  static RoomDetails = async (req, res) => {
    try {
      const roomId = req.params.id;
      const page = parseInt(req.query.page) || 1;
      const reviewsPerPage = 2;

      // Get room info
      const room = await RoomModel.findById(roomId);

      // Count total reviews for pagination
      const totalReviews = await ReviewsModel.countDocuments({ roomId });
      const totalPages = Math.ceil(totalReviews / reviewsPerPage);

      // Fetch paginated reviews
      const reviews = await ReviewsModel.find({ roomId })
        .sort({ createdAt: -1 })
        .skip((page - 1) * reviewsPerPage)
        .limit(reviewsPerPage)
        .populate("userId", "image name");

      // Get reply counts for each review
      const reviewsWithReplyCounts = await Promise.all(
        reviews.map(async (review) => {
          const replyCount = await ReplyModel.countDocuments({
            reviewId: review._id,
          });
          return {
            ...review.toObject(),
            replyCount,
          };
        })
      );

      // Fetch all reviews to calculate average rating
      const allReviews = await ReviewsModel.find({ roomId });

      let averageRating = 0;
      let avgService = 0,
        avgLocation = 0,
        avgAmenities = 0,
        avgPrices = 0,
        avgFood = 0;

      if (allReviews.length > 0) {
        const totalRating = allReviews.reduce((sum, review) => {
          const reviewTotal =
            review.serviceRating +
            review.locationRating +
            review.amenitiesRating +
            review.pricesRating +
            review.foodRating;
          return sum + reviewTotal / 5;
        }, 0);
        averageRating = (totalRating / allReviews.length).toFixed(1); // rounded to 1 decimal

        // Individual category averages (out of 100)
        avgService = Math.round(
          (allReviews.reduce((s, r) => s + r.serviceRating, 0) /
            allReviews.length) *
            20
        );
        avgLocation = Math.round(
          (allReviews.reduce((s, r) => s + r.locationRating, 0) /
            allReviews.length) *
            20
        );
        avgAmenities = Math.round(
          (allReviews.reduce((s, r) => s + r.amenitiesRating, 0) /
            allReviews.length) *
            20
        );
        avgPrices = Math.round(
          (allReviews.reduce((s, r) => s + r.pricesRating, 0) /
            allReviews.length) *
            20
        );
        avgFood = Math.round(
          (allReviews.reduce((s, r) => s + r.foodRating, 0) /
            allReviews.length) *
            20
        );
      }

      // Fetch user info if logged in
      let fullUser = null;
      if (req.user) {
        fullUser = await UserModel.findById(req.user.id);
      }

      // Flag for no reviews
      const noReviews = totalReviews === 0;

      // Render the view with pagination data
      res.render("rooms/room-details", {
        room,
        allAmenities,
        ratingmeasures,
        reviews: reviewsWithReplyCounts, // Use reviews with reply counts
        user: fullUser,
        currentPage: page,
        totalPages,
        noReviews,
        reviewsCount: totalReviews, // send total reviews count
        roomRating: averageRating, // send average rating
        avgService,
        avgLocation,
        avgAmenities,
        avgPrices,
        avgFood,
      });
    } catch (error) {
      console.log(error);
    }
  };

  static rooms = async (req, res) => {
    try {
      const perPage = 4;
      const page = parseInt(req.query.page) || 1;

      const totalRooms = await RoomModel.countDocuments({});
      const rooms = await RoomModel.find({})
        .skip((page - 1) * perPage)
        .limit(perPage);

      const totalPages = Math.ceil(totalRooms / perPage);

      res.render("room", {
        room: rooms,
        currentPage: page,
        totalPages,
        totalRooms,
      });
    } catch (err) {
      console.log(err);
    }
  };

  static changePassword = async (req, res) => {
    res.render("admin/change-password", {
      success: req.flash("success"),
      error: req.flash("error"),
    });
  };

  static updatePassword = async (req, res) => {
    try {
      const { currentPassword, newPassword, confirmPassword } = req.body;

      const user = await UserModel.findById(req.user.id); // or req.session.user._id if not using passport

      if (!user) {
        req.flash("error", "User not found.");
        return res.redirect("/change-password");
      }

      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        req.flash("error", "Current Password does not Match");
        return res.redirect("/change-password");
      }

      if (newPassword !== confirmPassword) {
        req.flash("error", "New passwords do not match");
        return res.redirect("/change-password");
        // return res.status(400).send("New passwords do not match.");
      }

      // Hash new password and save
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      user.password = hashedPassword;
      await user.save();

      req.flash("success", "Password updated successfully.");
      res.redirect("/change-password");
    } catch (err) {
      console.error(err);
      req.flash("error", "Something went wrong. Please try again.");
      res.redirect("/change-password");
    }
  };
}

module.exports = FrontController;
