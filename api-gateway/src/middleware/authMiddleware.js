const myLogger = require("../utils/logger");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET;

const validateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; //bearer , token (thats why we do [1] to get the token)

  if (!token) {
    myLogger.warn("Access attempt without valid token");
    return res.status(401).json({
      success: false,
      message: "Authentication required.",
    });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      myLogger.warn("Invalid token!");
      return res.status(429).json({
        success: false,
        message: "Invalid token!",
      });
    }
    req.user = user;
    next();
  });
};

module.exports = { validateToken };
