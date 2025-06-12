const UserModel = require("../models/user");

class UserController {
  static display = async (req, res) => {
    try {
      const id = req.params.id;
      const user = await UserModel.findById(id); // <-- FIXED
    //   console.log(user);
      res.render("users/display", {
        user,
      });
    } catch (error) {
      console.error("Error displaying user:", error);
      res.status(500).send("Server Error");
    }
  };
}

module.exports = UserController;
