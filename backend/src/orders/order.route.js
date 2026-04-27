const express = require("express");
const {
  createAOrder,
  createInstantFreeRental,
  getMyOrders,
  renewRentalItem,
  returnRentalItem,
} = require("./order.controller");
const verifyToken = require("../middleware/verifyToken");

const router = express.Router();

router.post("/", verifyToken, createAOrder);
router.post("/instant/:bookId", verifyToken, createInstantFreeRental);
router.get("/mine", verifyToken, getMyOrders);
router.patch("/:orderId/items/:itemId/renew", verifyToken, renewRentalItem);
router.patch("/:orderId/items/:itemId/return", verifyToken, returnRentalItem);

module.exports = router;
