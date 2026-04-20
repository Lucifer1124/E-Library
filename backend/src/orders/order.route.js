const express = require("express");
const { createAOrder, getMyOrders } = require("./order.controller");
const verifyToken = require("../middleware/verifyToken");

const router = express.Router();

router.post("/", verifyToken, createAOrder);
router.get("/mine", verifyToken, getMyOrders);

module.exports = router;
