const jwt = require("jsonwebtoken");
const User = require("../users/user.model");
const { SESSION_COOKIE_NAME } = require("../users/user.service");

const verifyToken = async (req, res, next) => {
  try {
    const header = req.headers.authorization || "";
    const cookieToken = req.cookies?.[SESSION_COOKIE_NAME];
    const token = cookieToken || (header.startsWith("Bearer ") ? header.split(" ")[1] : null);

    if (!token) {
      return res.status(401).json({ message: "Access denied. No token provided." });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
    const user = await User.findById(decoded.sub);

    if (!user) {
      return res.status(401).json({ message: "Session is no longer valid." });
    }

    req.user = user;
    return next();
  } catch (error) {
    console.error("Token verification failed", error);
    return res.status(401).json({ message: "Invalid or expired session token." });
  }
};

module.exports = verifyToken;
