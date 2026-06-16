const express = require("express");
const verifyToken = require("../middleware/verifyToken");
const verifyAdminToken = require("../middleware/verifyAdminToken");
const {
  payPendingFines,
  processRenewalPayment,
  processRenewalPayLater,
  settlePayLaterBill,
  getPaymentHistory,
  getAdminRentalHistory,
  getAdminFineStats,
} = require("./payment.controller");

const router = express.Router();

// User payment routes
router.post("/fines", verifyToken, payPendingFines);
router.post("/renewal", verifyToken, processRenewalPayment);
router.post("/renewal/pay-later", verifyToken, processRenewalPayLater);
router.post("/pay-later/settle", verifyToken, settlePayLaterBill);
router.get("/history", verifyToken, getPaymentHistory);

// Admin monitoring routes
router.get("/admin/rentals", verifyAdminToken, getAdminRentalHistory);
router.get("/admin/fines", verifyAdminToken, getAdminFineStats);

module.exports = router;
