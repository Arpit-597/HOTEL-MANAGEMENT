// const AdminModel = require("../models/admin");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const UserModel = require("../models/user");
const cloudinary = require("cloudinary");
const BookingModel = require("../models/booking");

//setup
cloudinary.config({
  cloud_name: process.env.cloudinary_name,
  api_key: process.env.cloudinary_api_key,
  api_secret: process.env.cloudinary_api_secret,
});

class AdminController {
  static AdminInsert = async (req, res) => {
    try {
      const {
        name,
        email,
        password,
        image
      } = req.body;
      //   console.log(req.body);
      const isEmail = await UserModel.findOne({
        email
      });
      if (!isEmail) {
        const hashPassword = await bcrypt.hash(password, 10);

        if (req.files) {
          const file = req.files.image;
          const imageUpload = await cloudinary.uploader.upload(
            file.tempFilePath, {
              folder: "hotel_user_images",
            }
          );

          const result = await UserModel.create({
            name,
            email,
            password: hashPassword,
            image: {
              public_id: imageUpload.public_id,
              url: imageUpload.secure_url,
            },
          });
        } else {
          const result = await UserModel.create({
            name,
            email,
            password: hashPassword,
            image,
          });
        }

        req.flash("success", "Account Successfully Registered");
        return res.redirect("/login");
      } else {
        req.flash("error", "Email already registered");
        return res.redirect("/signup");
      }
    } catch (err) {
      console.log(err);
    }
  };

  static verifyLogin = async (req, res) => {
    try {
      const {
        email,
        password
      } = req.body;
      const user = await UserModel.findOne({
        email
      });
      if (user) {
        const isMatch = await bcrypt.compare(password, user.password);
        if (isMatch) {
          // Include role in token payload
          const token = jwt.sign({
              id: user._id,
              name: user.name,
              email: user.email, // <-- ensure this is added
              image: user.image && user.image.url ?
                user.image :
                {
                  url: "/assets/images/default-avatar.png",
                  public_id: "default-avatar",
                },
              role: user.role,
            }, // role bhi add kiya
            process.env.jwt_secret_key, {
              expiresIn: "1d"
            }
          );

          // Store token in HTTP-only cookie
          res.cookie("token", token, {
            httpOnly: true,
            maxAge: 24 * 60 * 60 * 1000,
          });

          req.flash("success", "Logged In Successfully");

          // Redirect based on role
          if (user.role === "admin") {
            return res.redirect("/dashboard");
          } else if (user.role === "user") {
            return res.redirect("/"); // ya user ke liye jo home page ho
          } else {
            // Agar koi aur role hai toh default redirect
            return res.redirect("/");
          }
        } else {
          req.flash("error", "Email or Password not Match");
          return res.redirect("/login");
        }
      } else {
        req.flash("error", "Email not Found");
        return res.redirect("/login");
      }
    } catch (err) {
      console.log(err);
      // Optionally handle errors by redirecting or showing a message
      req.flash("error", "Something went wrong. Please try again.");
      return res.redirect("/login");
    }
  };

  static logout = async (req, res) => {
    try {
      res.clearCookie("token");
      // req.flash("success", "Logged Out Successfully");
      return res.redirect("/login");
    } catch (error) {
      console.log(error);
    }
  };

  // Add this method to your AdminController.js
  static adminBookingDisplay = async (req, res) => {
    try {
      const allBookings = await BookingModel.find({})
        .populate("room")
        .populate("user") // to get both room and user details
        .sort({
          _id: -1
        }); // latest bookings first

      res.render("booking/adminBookingDisplay", {
        // name: req.user.name, // admin name
        bookings: allBookings,
        error: req.flash("error"),
        success: req.flash("success"),
      });
    } catch (err) {
      console.log(err);
      req.flash("error", "Error fetching booking data");
      res.redirect("/dashboard");
    }
  };

  static adminCustomersDisplay = async (req, res) => {
    try {
      const usersWithCounts = await UserModel.aggregate([{
          $lookup: {
            from: "reviews", // reviews collection name
            localField: "_id",
            foreignField: "userId",
            as: "reviews",
          },
        },
        {
          $lookup: {
            from: "bookings", // bookings collection name
            localField: "_id",
            foreignField: "user", // field in bookings referencing user
            as: "bookings",
          },
        },
        {
          $addFields: {
            totalReviews: {
              $size: "$reviews"
            },
            totalBookings: {
              $size: "$bookings"
            },
          },
        },
        {
          $project: {
            reviews: 0,
            bookings: 0,
          },
        },
      ]);

      const bookings = await BookingModel.find()
        .populate("user") // get user details
        .populate("room"); // optional: get room details

      res.render("admin/customers", {
        bookings,
        users: usersWithCounts,
        success: req.flash("success"),
        error: req.flash("error"),
      });
    } catch (error) {
      console.log("Error fetching customer bookings:", error);
      res.status(500).send("Server Error");
    }
  };

  static adminUserDelete = async (req, res) => {
    try {
      await UserModel.findByIdAndDelete(req.params.id);
      req.flash("success", "User removed successfully.");
      res.redirect("/admin/booking/customers"); // or wherever your user list is
    } catch (err) {
      console.error(err);
      req.flash("error", "Failed to delete user.");
      res.redirect("/admin/booking/customers");
    }
  };

  static updateUser = async (req, res) => {
    try {
      const id = req.params.id;
      const {
        name,
        email,
        phone
      } = req.body;

      let data;

      // Handle file upload if image is provided
      if (req.files && req.files.image) {
        const user = await UserModel.findById(id);
        const oldImageId = user.image?.public_id;

        // Remove old image from cloudinary
        if (oldImageId) {
          await cloudinary.uploader.destroy(oldImageId);
        }

        // Upload new image
        const imageFile = req.files.image;
        const imageUpload = await cloudinary.uploader.upload(
          imageFile.tempFilePath, {
            folder: "hotel_user_images",
          }
        );

        data = {
          name,
          email,
          phone,
          image: {
            public_id: imageUpload.public_id,
            url: imageUpload.secure_url,
          },
        };
      } else {
        data = {
          name,
          email,
          phone,
        };
      }

      await UserModel.findByIdAndUpdate(id, data);

      req.flash("success", "User profile updated successfully");
      if (req.user.role === "admin") {
        res.redirect("/admin/booking/customers");
      } else if (req.user.role === "user") {
        res.redirect("/dashboard");
      } else {
        // Optional: redirect for unknown roles or handle error
        res.redirect("/"); // or show 403 Forbidden
      }
    } catch (error) {
      console.error("Error updating user:", error);
      req.flash("error", "Failed to update user");
      res.redirect("/admin/booking/customers");
    }
  };
}

module.exports = AdminController;