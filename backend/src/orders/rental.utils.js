// Shared utility functions for rental operations
const Order = require("./order.model");
const User = require("../users/user.model");
const {
  syncRentalOrder,
  getUserBlockState,
  normalizePositiveInteger,
} = require("./rental.service");

/**
 * Create standardized app error
 */
const createAppError = (status, message) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

/**
 * Convert order to public JSON
 */
const makePublicOrder = (order) =>
  typeof order?.toObject === "function" ? order.toObject() : order;

/**
 * Load query with optional session
 */
const loadWithSession = (query, session) => (session ? query.session(session) : query);

/**
 * Get user's rental standing
 */
const getUserRentalStanding = async (userId, session) => {
  const orders = await loadWithSession(Order.find({ userId }), session);
  let activeItemsCount = 0;
  let outstandingFine = 0;
  const activeRentalIds = new Set();
  const rentedBookIds = new Set();

  for (const order of orders) {
    await persistOrderIfChanged(order, session);

    for (const item of order.items || []) {
      const itemOutstandingFine = Math.max(
        (item.fineAccrued || 0) - (item.finePaid || 0) - (item.fineWaived || 0),
        0
      );

      outstandingFine += itemOutstandingFine;

      if (!item.returnedDate) {
        activeItemsCount += 1;
        activeRentalIds.add(order._id.toString());
        rentedBookIds.add(item.bookId.toString());
      }
    }
  }

  return {
    activeItemsCount,
    outstandingFine,
    activeRentalIds: [...activeRentalIds],
    rentedBookIds: [...rentedBookIds],
  };
};

/**
 * Sync user block state based on rental standing
 */
const syncUserBlockState = async (user, session) => {
  const standing = await getUserRentalStanding(user._id, session);
  const nextBlockState = getUserBlockState({
    manualBlock: user.manualBlock,
    outstandingFine: standing.outstandingFine,
    activeItemsCount: standing.activeItemsCount,
  });

  user.pendingFines = standing.outstandingFine;
  user.rentedBooks = standing.rentedBookIds;
  user.activeRentals = standing.activeRentalIds;
  user.isBlocked = nextBlockState.isBlocked;
  user.accountStatus = nextBlockState.isBlocked ? "Blocked" : "Active";
  user.blockReason = nextBlockState.reason;
  user.blockedAt = nextBlockState.isBlocked ? user.blockedAt || new Date() : null;

  if (typeof user.save === "function" && user.isModified?.()) {
    await user.save(session ? { session } : undefined);
  }

  return {
    ...nextBlockState,
    ...standing,
  };
};

/**
 * Persist order changes if modified
 */
const persistOrderIfChanged = async (order, session) => {
  syncRentalOrder(order);

  if (order.isModified?.()) {
    await order.save(session ? { session } : undefined);
  }

  return order;
};

module.exports = {
  createAppError,
  makePublicOrder,
  loadWithSession,
  getUserRentalStanding,
  syncUserBlockState,
  persistOrderIfChanged,
};
