const DAY_IN_MS = 24 * 60 * 60 * 1000;
const DEFAULT_RENTAL_DAYS = 5;
const RENEWAL_RATE_INR = 2;
const OVERDUE_FINE_PER_DAY_INR = 10;
const BLOCKLIST_FINE_LIMIT_INR = 5000;
const BLOCKLIST_ACTIVE_RENTAL_LIMIT = 10;

const addDays = (date, days) => new Date(new Date(date).getTime() + days * DAY_IN_MS);

const normalizePositiveInteger = (value, fallback = 0) => {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback;
  }

  return Math.floor(parsed);
};

const calculateDueDate = (issueDate, renewalDays = 0) =>
  addDays(issueDate, DEFAULT_RENTAL_DAYS + normalizePositiveInteger(renewalDays));

const calculateOverdueDays = (dueDate, referenceDate) => {
  const due = new Date(dueDate).getTime();
  const reference = new Date(referenceDate).getTime();

  if (reference <= due) {
    return 0;
  }

  return Math.ceil((reference - due) / DAY_IN_MS);
};

const getItemOutstandingFine = (item) =>
  Math.max((item.fineAccrued || 0) - (item.finePaid || 0) - (item.fineWaived || 0), 0);

const syncRentalItem = (item, now = new Date()) => {
  const issueDate = item.issueDate || now;
  const dueDate = item.dueDate || calculateDueDate(issueDate, item.renewalDays || 0);
  const statusReferenceDate = item.returnedDate || now;
  const overdueDays = calculateOverdueDays(dueDate, statusReferenceDate);

  item.issueDate = issueDate;
  item.dueDate = dueDate;
  item.renewalDays = normalizePositiveInteger(item.renewalDays, 0);
  item.renewalFeePerDay = item.renewalFeePerDay ?? RENEWAL_RATE_INR;
  item.fineAccrued = overdueDays * OVERDUE_FINE_PER_DAY_INR;

  if (item.returnedDate) {
    item.status = "returned";
  } else if (overdueDays > 0) {
    item.status = "overdue";
  } else {
    item.status = "active";
  }

  return {
    overdueDays,
    outstandingFine: getItemOutstandingFine(item),
  };
};

const syncRentalOrder = (order, now = new Date()) => {
  if (!order?.items) {
    return {
      activeItemsCount: 0,
      outstandingFine: 0,
    };
  }

  let activeItemsCount = 0;
  let outstandingFine = 0;

  order.items.forEach((item) => {
    const runtime = syncRentalItem(item, now);

    if (!item.returnedDate) {
      activeItemsCount += 1;
    }

    outstandingFine += runtime.outstandingFine;
  });

  order.totalOutstandingFine = outstandingFine;

  return {
    activeItemsCount,
    outstandingFine,
  };
};

const getUserBlockState = ({ manualBlock, outstandingFine, activeItemsCount }) => {
  if (manualBlock) {
    return {
      isBlocked: true,
      reason: "Manually blocked by admin.",
    };
  }

  if (outstandingFine >= BLOCKLIST_FINE_LIMIT_INR) {
    return {
      isBlocked: true,
      reason: `Outstanding fines reached INR ${BLOCKLIST_FINE_LIMIT_INR}.`,
    };
  }

  if (activeItemsCount >= BLOCKLIST_ACTIVE_RENTAL_LIMIT) {
    return {
      isBlocked: true,
      reason: `User already has ${BLOCKLIST_ACTIVE_RENTAL_LIMIT}+ active rentals.`,
    };
  }

  return {
    isBlocked: false,
    reason: "",
  };
};

module.exports = {
  BLOCKLIST_ACTIVE_RENTAL_LIMIT,
  BLOCKLIST_FINE_LIMIT_INR,
  DEFAULT_RENTAL_DAYS,
  OVERDUE_FINE_PER_DAY_INR,
  RENEWAL_RATE_INR,
  addDays,
  calculateDueDate,
  calculateOverdueDays,
  getItemOutstandingFine,
  getUserBlockState,
  normalizePositiveInteger,
  syncRentalItem,
  syncRentalOrder,
};
