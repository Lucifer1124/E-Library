const verifyToken = require("./verifyToken");

const verifyAdminToken = (req, res, next) => {
  verifyToken(req, res, () => {
    if (req.user.role !== "admin") {
      return res
        .status(403)
        .json({ message: "Access denied. Admin permission required." });
    }

    return next();
  });
};

module.exports = verifyAdminToken;
