const express = require("express");
const route = express.Router();
const FrontController = require("../controllers/FrontController");
const AdminController = require("../controllers/AdminController");
const UserController = require("../controllers/UserController");
const RoomController = require("../controllers/RoomController");
const BookingController = require("../controllers/BookingController");
const checkAuth = require("../middlewares/checkAuth");

// Front Controller
route.get("/", FrontController.home);
route.get("/about", FrontController.about);
route.get("/room", FrontController.rooms);
route.get("/restaurant", FrontController.restaurant);
route.get("/contact", FrontController.contact);
route.get("/dashboard", checkAuth, FrontController.dashboard);
route.get("/login", FrontController.Login);
route.get("/signup", FrontController.SignUp);
route.get("/detailsRoom/:id", FrontController.RoomDetails);

// Admin Controller
route.post("/adminInsert", AdminController.AdminInsert);
route.post("/verifyLogin", AdminController.verifyLogin);
route.get("/logout", AdminController.logout);
// Admin Booking Controller - Add this after your existing admin routes
route.get("/admin/bookings", checkAuth, AdminController.adminBookingDisplay);
route.get("/admin/booking/customers", checkAuth, AdminController.adminCustomersDisplay);
route.post('/admin/users/delete/:id',checkAuth,AdminController.adminUserDelete) 
// Both same for if user update or admin updates
route.post('/admin/users/update/:id', AdminController.updateUser);

// User Controller
route.get("/user/bookings", checkAuth, BookingController.userBookingDisplay);
route.get('/user/update/:id',checkAuth,UserController.display)

// Room Controller
route.get("/rooms/display", checkAuth, RoomController.display);
route.post("/rooms/add", checkAuth, RoomController.addRoom);
route.get("/roomDelete/:id", checkAuth, RoomController.deleteRoom);
route.get("/roomEdit/:id", checkAuth, RoomController.editForm);
route.post("/roomsupdate/:id", checkAuth, RoomController.updateRoom);
route.get("/roomView/:id",checkAuth, RoomController.viewRoom);
route.post("/addReviews",checkAuth, RoomController.addReviews);
// New reply routes
route.post("/addReply", checkAuth, RoomController.addReply);
route.get("/getReplies/:reviewId", RoomController.getReplies);

// Booking Controlelr
//room booing
route.post("/booking/add", checkAuth, BookingController.insertBooking);
route.post("/bookings/verify", checkAuth, BookingController.verifyPayment);
route.get("/bookings/cancel/:id", checkAuth, BookingController.cancelBooking);
route.get("/bookings/invoice/:id", checkAuth,BookingController.downloadInvoice);
route.post("/admin/bookings/:id",checkAuth,BookingController.changeBookingStatus)

// Change password for all
// Show change password form
route.get('/change-password',checkAuth,FrontController.changePassword) 

// Handle password update
route.post('/change-password',checkAuth,FrontController.updatePassword)

module.exports = route;
