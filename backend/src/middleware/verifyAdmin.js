const verifyToken = require("./verifyToken");

const verifyAdmin = (req, res, next) => {
  verifyToken(req, res, () => {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Forbidden. Admin access only." });
    }

    return next();
  });
};

module.exports = verifyAdmin;
