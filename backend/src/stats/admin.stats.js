const express = require("express");
const Order = require("../orders/order.model");
const Book = require("../books/book.model");
const User = require("../users/user.model");
const verifyAdminToken = require("../middleware/verifyAdminToken");

const router = express.Router();

router.get("/", verifyAdminToken, async (req, res) => {
  try {
    const totalOrders = await Order.countDocuments();
    const totalBooks = await Book.countDocuments();
    const totalSellers = await User.countDocuments({ role: "user" });

    const totalSalesResult = await Order.aggregate([
      {
        $group: {
          _id: null,
          totalSales: { $sum: "$totalPrice" },
        },
      },
    ]);

    const monthlySales = await Order.aggregate([
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
          totalSales: { $sum: "$totalPrice" },
          totalOrders: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const latestOrders = await Order.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select("username totalPrice paymentMethod paymentStatus createdAt")
      .lean();

    return res.status(200).json({
      totalOrders,
      totalBooks,
      totalSellers,
      totalSales: totalSalesResult[0]?.totalSales || 0,
      monthlySales,
      latestOrders,
    });
  } catch (error) {
    console.error("Error fetching admin stats:", error);
    return res.status(500).json({ message: "Failed to fetch admin stats." });
  }
});

module.exports = router;
