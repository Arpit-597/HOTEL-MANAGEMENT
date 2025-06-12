const jwt = require("jsonwebtoken");
const UserModel = require("../models/user");
const setUserInfo = async (req, res, next) => {
  const token = req.cookies.token;
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.jwt_secret_key);
      req.user = decoded; // so you can still use req.user
      const user = await UserModel.findById(decoded.id);
      // console.log("Decoded JWT user =>", decoded)/;
      req.user = user;
      res.locals.user = user;
      res.locals.name = decoded.name; // in this local means that in all the ejs files , for here as name is written so name will be passed to all the ejs files
      res.locals.role = decoded.role;
    } catch (err) {
      res.locals.user = null;
      res.locals.name = null;
      res.locals.role = null;
    }
  } else {
    res.locals.user = null;
    res.locals.name = null;
    res.locals.role = null;
  }
  next();
};

module.exports = setUserInfo;
