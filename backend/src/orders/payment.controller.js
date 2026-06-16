const mongoose = require("mongoose");
const Order = require("./order.model");
const User = require("../users/user.model");
const {
  syncRentalOrder,
  normalizePositiveInteger,
  calculateDueDate,
  DEFAULT_RENTAL_DAYS,
  RENEWAL_RATE_INR,
} = require("./rental.service");
const {
  syncUserBlockState,
  getUserRentalStanding,
  persistOrderIfChanged,
  makePublicOrder,
} = require("./rental.utils");

/**
 * Pay pending fines
 * POST /api/payments/fines
 * Body: { amount: number, paymentMethod: 'gateway' | 'cash' }
 */
const payPendingFines = async (req, res) => {
  try {
    const { amount, paymentMethod = "gateway" } = req.body;
    const amountToPay = normalizePositiveInteger(amount, 0);

    if (amountToPay < 1) {
      return res.status(400).json({ message: "Please enter a valid payment amount." });
    }

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(401).json({ message: "Session is no longer valid." });
    }

    const standing = await getUserRentalStanding(user._id);

    if (standing.outstandingFine < 1) {
      return res.status(400).json({ message: "You have no outstanding fines to pay." });
    }

    if (amountToPay > standing.outstandingFine) {
      return res.status(400).json({
        message: `You can only pay up to ₹${standing.outstandingFine}. Overpayment not allowed.`,
      });
    }

    // Fetch all orders and distribute payment across items with outstanding fines
    const orders = await Order.find({ userId: req.user._id });
    let remainingPayment = amountToPay;

    for (const order of orders) {
      if (remainingPayment <= 0) break;

      syncRentalOrder(order);

      for (const item of order.items || []) {
        if (remainingPayment <= 0) break;

        const itemOutstandingFine = Math.max(
          (item.fineAccrued || 0) - (item.finePaid || 0) - (item.fineWaived || 0),
          0
        );

        if (itemOutstandingFine > 0) {
          const paymentToApply = Math.min(remainingPayment, itemOutstandingFine);
          item.finePaid = (item.finePaid || 0) + paymentToApply;
          remainingPayment -= paymentToApply;
        }
      }

      await persistOrderIfChanged(order);
    }

    // Sync user standing
    await syncUserBlockState(user);

    return res.status(200).json({
      message: "Fine payment processed successfully.",
      amountPaid: amountToPay,
      remainingFine: user.pendingFines,
      accountStatus: user.accountStatus,
      isBlocked: user.isBlocked,
    });
  } catch (error) {
    console.error("Error processing fine payment", error);
    return res.status(500).json({ message: "Failed to process fine payment." });
  }
};

/**
 * Process renewal payment (immediate payment)
 * POST /api/payments/renewal
 * Body: { orderId, itemId, extraDays, paymentMethod }
 */
const processRenewalPayment = async (req, res) => {
  try {
    const { orderId, itemId, extraDays, paymentMethod = "gateway" } = req.body;
    const extraDaysInt = normalizePositiveInteger(extraDays, 0);

    if (extraDaysInt < 1) {
      return res.status(400).json({ message: "Renewal must be at least 1 extra day." });
    }

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(401).json({ message: "Session is no longer valid." });
    }

    const standing = await syncUserBlockState(user);

    if (standing.isBlocked || user.accountStatus !== "Active" || user.pendingFines > 0) {
      return res.status(403).json({
        message: "Clear your fines and restore your account before renewing this rental.",
      });
    }

    const order = await Order.findOne({ _id: orderId, userId: req.user._id });

    if (!order) {
      return res.status(404).json({ message: "Rental not found." });
    }

    syncRentalOrder(order);
    const item = order.items.id(itemId);

    if (!item) {
      return res.status(404).json({ message: "Rental item not found." });
    }

    if (item.returnedDate) {
      return res.status(400).json({ message: "Returned books cannot be renewed." });
    }

    // Calculate renewal cost
    const renewalCost = extraDaysInt * RENEWAL_RATE_INR;

    // In a real system, process payment here
    // For now, we simulate successful payment
    const paymentProcessed = true; // Would be result of gateway call

    if (!paymentProcessed) {
      return res.status(402).json({ message: "Payment processing failed. Please try again." });
    }

    // Update item with renewal
    item.renewalDays += extraDaysInt;
    item.dueDate = calculateDueDate(item.issueDate, item.renewalDays);
    order.rentalDays = Math.max(order.rentalDays, DEFAULT_RENTAL_DAYS + item.renewalDays);
    order.totalPrice += renewalCost;

    await persistOrderIfChanged(order);

    return res.status(200).json({
      message: "Rental renewed with immediate payment.",
      renewalCost,
      order: makePublicOrder(order),
    });
  } catch (error) {
    console.error("Error processing renewal payment", error);
    return res.status(500).json({ message: "Failed to process renewal payment." });
  }
};

/**
 * Process renewal with pay-later option
 * POST /api/payments/renewal/pay-later
 * Body: { orderId, itemId, extraDays }
 */
const processRenewalPayLater = async (req, res) => {
  try {
    const { orderId, itemId, extraDays } = req.body;
    const extraDaysInt = normalizePositiveInteger(extraDays, 0);

    if (extraDaysInt < 1) {
      return res.status(400).json({ message: "Renewal must be at least 1 extra day." });
    }

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(401).json({ message: "Session is no longer valid." });
    }

    const standing = await syncUserBlockState(user);

    if (standing.isBlocked || user.accountStatus !== "Active" || user.pendingFines > 0) {
      return res.status(403).json({
        message: "Clear your fines and restore your account before renewing this rental.",
      });
    }

    const order = await Order.findOne({ _id: orderId, userId: req.user._id });

    if (!order) {
      return res.status(404).json({ message: "Rental not found." });
    }

    syncRentalOrder(order);
    const item = order.items.id(itemId);

    if (!item) {
      return res.status(404).json({ message: "Rental item not found." });
    }

    if (item.returnedDate) {
      return res.status(400).json({ message: "Returned books cannot be renewed." });
    }

    // Calculate renewal cost
    const renewalCost = extraDaysInt * RENEWAL_RATE_INR;

    // Update item with renewal
    item.renewalDays += extraDaysInt;
    item.dueDate = calculateDueDate(item.issueDate, item.renewalDays);
    item.renewalPaymentMethod = "pay-later"; // Track that this was paid later
    order.rentalDays = Math.max(order.rentalDays, DEFAULT_RENTAL_DAYS + item.renewalDays);

    // Add renewal cost to user's pay-later bill instead of order price
    user.payLaterBill = (user.payLaterBill || 0) + renewalCost;

    await persistOrderIfChanged(order);
    await user.save();

    return res.status(200).json({
      message: "Renewal added to your pay-later bill.",
      renewalCost,
      payLaterBill: user.payLaterBill,
      order: makePublicOrder(order),
    });
  } catch (error) {
    console.error("Error processing pay-later renewal", error);
    return res.status(500).json({ message: "Failed to process pay-later renewal." });
  }
};

/**
 * Pay accumulated pay-later bill
 * POST /api/payments/pay-later/settle
 * Body: { amount, paymentMethod }
 */
const settlePayLaterBill = async (req, res) => {
  try {
    const { amount, paymentMethod = "gateway" } = req.body;
    const amountToPay = normalizePositiveInteger(amount, 0);

    if (amountToPay < 1) {
      return res.status(400).json({ message: "Please enter a valid payment amount." });
    }

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(401).json({ message: "Session is no longer valid." });
    }

    if (!user.payLaterBill || user.payLaterBill < 1) {
      return res.status(400).json({ message: "You have no pay-later bill to settle." });
    }

    if (amountToPay > user.payLaterBill) {
      return res.status(400).json({
        message: `You can only pay up to ₹${user.payLaterBill}. Overpayment not allowed.`,
      });
    }

    // Simulate gateway payment
    const paymentProcessed = true;

    if (!paymentProcessed) {
      return res.status(402).json({ message: "Payment processing failed. Please try again." });
    }

    // Reduce pay-later bill
    user.payLaterBill -= amountToPay;
    await user.save();

    return res.status(200).json({
      message: "Pay-later bill payment processed successfully.",
      amountPaid: amountToPay,
      remainingBill: user.payLaterBill,
    });
  } catch (error) {
    console.error("Error settling pay-later bill", error);
    return res.status(500).json({ message: "Failed to settle pay-later bill." });
  }
};

/**
 * Get user's payment/transaction history
 * GET /api/payments/history
 */
const getPaymentHistory = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(401).json({ message: "Session is no longer valid." });
    }

    // Fetch all orders and extract payment info
    const orders = await Order.find({ userId: req.user._id }).sort({ createdAt: -1 });

    const history = [];

    for (const order of orders) {
      syncRentalOrder(order);

      for (const item of order.items || []) {
        if (item.finePaid > 0 || item.fineWaived > 0 || item.returnedDate) {
          history.push({
            type: item.returnedDate ? "return" : "fine-payment",
            bookTitle: item.title,
            issueDate: item.issueDate,
            dueDate: item.dueDate,
            returnedDate: item.returnedDate,
            fineAccrued: item.fineAccrued || 0,
            finePaid: item.finePaid || 0,
            fineWaived: item.fineWaived || 0,
            renewalDays: item.renewalDays,
            renewalPaymentMethod: item.renewalPaymentMethod,
          });
        }
      }
    }

    return res.status(200).json({
      history,
      totalFinesPaid: user.pendingFines === 0 ? orders.reduce((sum, o) => sum + o.totalOutstandingFine, 0) : 0,
      currentPendingFines: user.pendingFines,
      currentPayLaterBill: user.payLaterBill,
    });
  } catch (error) {
    console.error("Error fetching payment history", error);
    return res.status(500).json({ message: "Failed to fetch payment history." });
  }
};

/**
 * ADMIN: Get detailed rental activity/history
 * GET /api/admin/rentals
 * Query: status, userId, page, limit, startDate, endDate
 */
const getAdminRentalHistory = async (req, res) => {
  try {
    const { status, userId, page = 1, limit = 20, startDate, endDate } = req.query;

    const pageNum = Math.max(1, parseInt(page) || 1);
    const pageLimit = Math.min(100, Math.max(1, parseInt(limit) || 20));
    const skip = (pageNum - 1) * pageLimit;

    // Build filter
    const filter = {};

    if (userId) {
      filter.userId = mongoose.Types.ObjectId.createFromHexString(userId);
    }

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    // Get orders with items matching status filter
    const orders = await Order.find(filter)
      .populate("userId", "username accountStatus pendingFines activeRentals")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageLimit);

    const rentalHistory = [];

    for (const order of orders) {
      syncRentalOrder(order);

      for (const item of order.items || []) {
        // Filter by item status if provided
        if (status && item.status !== status) {
          continue;
        }

        rentalHistory.push({
          orderId: order._id,
          itemId: item._id,
          username: order.userId?.username,
          userId: order.userId?._id,
          bookTitle: item.title,
          seller: item.sellerUsername,
          copyNumber: item.copyNumber,
          issueDate: item.issueDate,
          dueDate: item.dueDate,
          returnedDate: item.returnedDate,
          status: item.status,
          fineAccrued: item.fineAccrued || 0,
          finePaid: item.finePaid || 0,
          fineWaived: item.fineWaived || 0,
          outstandingFine: Math.max(
            (item.fineAccrued || 0) - (item.finePaid || 0) - (item.fineWaived || 0),
            0
          ),
          renewalDays: item.renewalDays,
          renewalPaymentMethod: item.renewalPaymentMethod,
          orderTotal: order.totalPrice,
        });
      }
    }

    const total = rentalHistory.length;
    const totalOrders = await Order.countDocuments(filter);

    return res.status(200).json({
      rentalHistory,
      pagination: {
        page: pageNum,
        limit: pageLimit,
        total,
        totalOrders,
        pages: Math.ceil(totalOrders / pageLimit),
      },
    });
  } catch (error) {
    console.error("Error fetching admin rental history", error);
    return res.status(500).json({ message: "Failed to fetch rental history." });
  }
};

/**
 * ADMIN: Get fine statistics
 * GET /api/admin/fines
 */
const getAdminFineStats = async (req, res) => {
  try {
    // Get all users with pending fines
    const usersWithFines = await User.find({ pendingFines: { $gt: 0 } }).sort({ pendingFines: -1 });

    // Get all orders with overdue items
    const orders = await Order.find();
    const overdueStats = {
      totalOverdueItems: 0,
      totalAccruedFines: 0,
      totalPaidFines: 0,
      totalWaivedFines: 0,
      totalOutstandingFines: 0,
    };

    for (const order of orders) {
      syncRentalOrder(order);

      for (const item of order.items || []) {
        if (item.fineAccrued > 0) {
          overdueStats.totalOverdueItems += 1;
          overdueStats.totalAccruedFines += item.fineAccrued || 0;
          overdueStats.totalPaidFines += item.finePaid || 0;
          overdueStats.totalWaivedFines += item.fineWaived || 0;
          overdueStats.totalOutstandingFines += Math.max(
            (item.fineAccrued || 0) - (item.finePaid || 0) - (item.fineWaived || 0),
            0
          );
        }
      }
    }

    return res.status(200).json({
      usersWithFines: usersWithFines.map((user) => ({
        userId: user._id,
        username: user.username,
        pendingFines: user.pendingFines,
        isBlocked: user.isBlocked,
        accountStatus: user.accountStatus,
      })),
      fineStats: overdueStats,
      totalUsersAffected: usersWithFines.length,
    });
  } catch (error) {
    console.error("Error fetching admin fine stats", error);
    return res.status(500).json({ message: "Failed to fetch fine statistics." });
  }
};

module.exports = {
  payPendingFines,
  processRenewalPayment,
  processRenewalPayLater,
  settlePayLaterBill,
  getPaymentHistory,
  getAdminRentalHistory,
  getAdminFineStats,
};
