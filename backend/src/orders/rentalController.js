const mongoose = require("mongoose");
const Order = require("./order.model");
const Book = require("../books/book.model");
const User = require("../users/user.model");
const {
  DEFAULT_RENTAL_DAYS,
  RENEWAL_RATE_INR,
  calculateDueDate,
  getUserBlockState,
  normalizePositiveInteger,
  syncRentalOrder,
} = require("./rental.service");

const TRANSACTION_UNSUPPORTED_MESSAGES = [
  "Transaction numbers are only allowed on a replica set member or mongos",
  "Standalone servers do not support transactions",
];

const loadWithSession = (query, session) => (session ? query.session(session) : query);

const isTransactionUnsupported = (error) =>
  TRANSACTION_UNSUPPORTED_MESSAGES.some((message) => error.message?.includes(message));

const makePublicOrder = (order) =>
  typeof order?.toObject === "function" ? order.toObject() : order;

const createAppError = (status, message) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

const buildBookCopyMap = async (books, session) => {
  const activeOrderDocs = await loadWithSession(
    Order.find({ "items.bookId": { $in: books.map((book) => book._id) } }),
    session
  );

  const activeCopiesByBookId = new Map();

  for (const order of activeOrderDocs) {
    for (const item of order.items || []) {
      if (item.returnedDate || !item.bookId) {
        continue;
      }

      const bookId = item.bookId.toString();
      const usedCopies = activeCopiesByBookId.get(bookId) || new Set();

      if (Number.isInteger(item.copyNumber) && item.copyNumber > 0) {
        usedCopies.add(item.copyNumber);
      }

      activeCopiesByBookId.set(bookId, usedCopies);
    }
  }

  return activeCopiesByBookId;
};

const resolveCopyNumber = (book, activeCopiesByBookId) => {
  const bookId = book._id.toString();
  const activeCopies = activeCopiesByBookId.get(bookId) || new Set();
  const totalCopies = Math.max(
    Number(book.stock || 0) + Number(book.currentPossessors?.length || 0),
    0
  );

  if (totalCopies < 1) {
    return book.isFree ? null : 1;
  }

  for (let copyNumber = 1; copyNumber <= totalCopies; copyNumber += 1) {
    if (!activeCopies.has(copyNumber)) {
      activeCopies.add(copyNumber);
      activeCopiesByBookId.set(bookId, activeCopies);
      return copyNumber;
    }
  }

  const nextCopyNumber = totalCopies + 1;
  activeCopies.add(nextCopyNumber);
  activeCopiesByBookId.set(bookId, activeCopies);
  return nextCopyNumber;
};

const persistOrderIfChanged = async (order, session) => {
  syncRentalOrder(order);

  if (order.isModified?.()) {
    await order.save(session ? { session } : undefined);
  }

  return order;
};

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
    ...standing,
    isBlocked: user.isBlocked,
    blockReason: user.blockReason,
    accountStatus: user.accountStatus,
    pendingFines: user.pendingFines,
  };
};

const validateRentalRequest = ({
  user,
  books,
  validIds,
  demoCard,
  paymentMethod,
  allBooksFree,
}) => {
  if (user.accountStatus !== "Active") {
    throw createAppError(403, "This account is currently blocked from borrowing books.");
  }

  if ((user.pendingFines || 0) > 0) {
    throw createAppError(
      403,
      "Clear your pending fines before starting another rental."
    );
  }

  if (books.length !== validIds.length) {
    throw createAppError(400, "Some selected books are no longer available.");
  }

  for (const book of books) {
    if (book.sellerId.toString() === user._id.toString()) {
      throw createAppError(403, "You cannot rent your own listing.");
    }

    if ((book.stock || 0) < 1) {
      throw createAppError(409, "Book Out of Stock");
    }

    if ((user.rentedBooks || []).some((bookId) => bookId.toString() === book._id.toString())) {
      throw createAppError(
        409,
        `You already have ${book.title} in your active library.`
      );
    }
  }

  if (!allBooksFree && paymentMethod === "demo-card") {
    if (
      !demoCard?.cardNumber?.trim() ||
      !demoCard?.expiry?.trim() ||
      !demoCard?.cvc?.trim()
    ) {
      throw createAppError(400, "Demo card details are required for card checkout.");
    }
  }
};

const reserveBooksAtomically = async (books, userId, session) => {
  const reservedBooks = [];
  try {
    for (const book of books) {
      const updatedBook = await loadWithSession(
        Book.findOneAndUpdate(
          {
            _id: book._id,
            stock: { $gt: 0 },
            sellerId: { $ne: userId },
            currentPossessors: { $ne: userId },
          },
          {
            $inc: { stock: -1 },
            $addToSet: { currentPossessors: userId },
          },
          {
            new: true,
          }
        ),
        session
      );

      if (!updatedBook) {
        throw createAppError(409, "Book Out of Stock");
      }

      reservedBooks.push(updatedBook);
    }
  } catch (error) {
    if (!session && reservedBooks.length) {
      await Promise.all(
        reservedBooks.map((reservedBook) =>
          Book.updateOne(
            { _id: reservedBook._id },
            {
              $inc: { stock: 1 },
              $pull: { currentPossessors: userId },
            }
          )
        )
      );
    }

    throw error;
  }

  return reservedBooks;
};

const buildRentalItems = async (books, renewalDays, session) => {
  const issueDate = new Date();
  const activeCopiesByBookId = await buildBookCopyMap(books, session);

  return books.map((book) => ({
    bookId: book._id,
    title: book.title,
    price: book.isFree ? 0 : book.newPrice,
    sellerUsername: book.sellerUsername,
    coverImage: book.coverImage,
    documentName: book.documentName || "",
    documentMimeType: book.documentMimeType || "",
    hasDocument: Boolean(book.documentStorageName),
    isFree: Boolean(book.isFree),
    copyNumber: resolveCopyNumber(book, activeCopiesByBookId),
    issueDate,
    dueDate: calculateDueDate(issueDate, renewalDays),
    returnedDate: null,
    renewalDays,
    renewalFeePerDay: RENEWAL_RATE_INR,
    status: "active",
    fineAccrued: 0,
    finePaid: 0,
    fineWaived: 0,
  }));
};

const createRentalDocument = async ({
  user,
  contactName,
  phone,
  address,
  reservedBooks,
  renewalDays,
  paymentMethod,
  demoCard,
  session,
}) => {
  const items = await buildRentalItems(reservedBooks, renewalDays, session);
  const baseRentalTotal = items.reduce((sum, item) => sum + item.price, 0);
  const renewalTotal = items.length * renewalDays * RENEWAL_RATE_INR;
  const totalPrice = baseRentalTotal + renewalTotal;
  const order = new Order({
    userId: user._id,
    username: user.username,
    contactName: contactName.trim(),
    phone: phone.trim(),
    address: {
      street: address.street?.trim(),
      city: address.city?.trim(),
      country: address.country?.trim(),
      state: address.state?.trim(),
      zipcode: address.zipcode?.trim(),
    },
    items,
    rentalDays: DEFAULT_RENTAL_DAYS + renewalDays,
    renewalFeePerDay: RENEWAL_RATE_INR,
    totalOutstandingFine: 0,
    totalPrice,
    paymentMethod,
    paymentStatus: paymentMethod === "cash" ? "pending" : "demo-approved",
    demoPayment:
      paymentMethod === "demo-card"
        ? {
            transactionId: `DEMO-${Date.now()}`,
            last4: demoCard.cardNumber.trim().slice(-4),
          }
        : undefined,
  });

  await order.save(session ? { session } : undefined);

  user.activeRentals = [...new Set([...(user.activeRentals || []), order._id.toString()])];
  user.rentedBooks = [
    ...new Set([
      ...(user.rentedBooks || []).map((bookId) => bookId.toString()),
      ...reservedBooks.map((book) => book._id.toString()),
    ]),
  ];
  await user.save(session ? { session } : undefined);

  return order;
};

const runCreateRental = async (payload, session) => {
  const {
    userId,
    contactName,
    phone,
    address,
    validIds,
    paymentMethod,
    demoCard,
    renewalDays,
  } = payload;

  const user = await loadWithSession(User.findById(userId), session);

  if (!user) {
    throw createAppError(401, "Session is no longer valid.");
  }

  await syncUserBlockState(user, session);

  const books = await loadWithSession(
    Book.find({ _id: { $in: validIds } }).select(
      "title newPrice sellerId sellerUsername coverImage documentName documentMimeType documentStorageName isFree stock currentPossessors"
    ),
    session
  );

  const allBooksFree = books.length > 0 && books.every((book) => book.isFree);

  validateRentalRequest({
    user,
    books,
    validIds,
    demoCard,
    paymentMethod,
    allBooksFree,
  });

  const reservedBooks = await reserveBooksAtomically(books, user._id, session);
  const order = await createRentalDocument({
    user,
    contactName,
    phone,
    address,
    reservedBooks,
    renewalDays,
    paymentMethod,
    demoCard,
    session,
  });

  await syncUserBlockState(user, session);
  return order;
};

const runWithOptionalTransaction = async (work) => {
  const session = await mongoose.startSession();

  try {
    let result;
    await session.withTransaction(async () => {
      result = await work(session);
    });
    return result;
  } catch (error) {
    if (isTransactionUnsupported(error)) {
      return work(null);
    }

    throw error;
  } finally {
    await session.endSession();
  }
};

const createAOrder = async (req, res) => {
  try {
    const {
      contactName,
      phone,
      address,
      productIds = [],
      paymentMethod = "cash",
      demoCard,
      renewalDays = 0,
    } = req.body;

    if (!contactName || !phone || !address) {
      return res
        .status(400)
        .json({ message: "Contact name, phone, and address are required." });
    }

    if (!["cash", "demo-card"].includes(paymentMethod)) {
      return res.status(400).json({ message: "Invalid payment method." });
    }

    if (!Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({ message: "At least one book is required." });
    }

    const uniqueIds = [...new Set(productIds)];
    const validIds = uniqueIds.filter((id) => mongoose.Types.ObjectId.isValid(id));

    if (validIds.length === 0 || validIds.length !== uniqueIds.length) {
      return res.status(400).json({
        message: "We couldn't process this rental - missing item details.",
      });
    }

    const normalizedRenewalDays = normalizePositiveInteger(renewalDays, 0);

    const order = await runWithOptionalTransaction((session) =>
      runCreateRental(
        {
          userId: req.user._id,
          contactName,
          phone,
          address,
          validIds,
          paymentMethod,
          demoCard,
          renewalDays: normalizedRenewalDays,
        },
        session
      )
    );

    return res.status(201).json(makePublicOrder(order));
  } catch (error) {
    console.error("Error creating rental", error);
    return res
      .status(error.status || 500)
      .json({ message: error.message || "Something went sideways with that rental. Let's try again." });
  }
};

const createInstantFreeRental = async (req, res) => {
  try {
    const bookId = req.params.bookId;

    if (!mongoose.Types.ObjectId.isValid(bookId)) {
      return res.status(400).json({ message: "That library title could not be found." });
    }

    const book = await Book.findById(bookId).select("isFree");

    if (!book) {
      return res.status(404).json({ message: "That library title could not be found." });
    }

    if (!book.isFree) {
      return res.status(400).json({ message: "This title still needs the rental flow." });
    }

    const order = await runWithOptionalTransaction((session) =>
      runCreateRental(
        {
          userId: req.user._id,
          contactName: req.user.username,
          phone: "self-service",
          address: {
            street: "Instant library issue",
            city: "Digital Stack",
            country: "Local",
            state: "Library",
            zipcode: "000000",
          },
          validIds: [bookId],
          paymentMethod: "cash",
          demoCard: undefined,
          renewalDays: 0,
        },
        session
      )
    );

    return res.status(201).json(makePublicOrder(order));
  } catch (error) {
    console.error("Error creating instant free rental", error);
    return res.status(error.status || 500).json({
      message: error.message || "We couldn't tuck that free title into your library.",
    });
  }
};

const getMyOrders = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(401).json({ message: "Session is no longer valid." });
    }

    await syncUserBlockState(user);
    const orders = await Order.find({ userId: user._id }).sort({ createdAt: -1 });

    for (const order of orders) {
      await persistOrderIfChanged(order);
    }

    return res.status(200).json(orders.map((order) => makePublicOrder(order)));
  } catch (error) {
    console.error("Error fetching rentals", error);
    return res.status(500).json({ message: "Failed to fetch rentals." });
  }
};

const findOwnedRentalItem = async (userId, orderId, itemId, session) => {
  const order = await loadWithSession(Order.findOne({ _id: orderId, userId }), session);

  if (!order) {
    return {};
  }

  syncRentalOrder(order);
  const item = order.items.id(itemId);

  return { order, item };
};

const renewRentalItem = async (req, res) => {
  try {
    const { orderId, itemId } = req.params;
    const extraDays = normalizePositiveInteger(req.body.extraDays, 0);

    if (extraDays < 1) {
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

    const { order, item } = await findOwnedRentalItem(req.user._id, orderId, itemId);

    if (!order || !item) {
      return res.status(404).json({ message: "Rental item not found." });
    }

    if (item.returnedDate) {
      return res.status(400).json({ message: "Returned books cannot be renewed." });
    }

    item.renewalDays += extraDays;
    item.dueDate = calculateDueDate(item.issueDate, item.renewalDays);
    order.rentalDays = Math.max(order.rentalDays, DEFAULT_RENTAL_DAYS + item.renewalDays);
    order.totalPrice += extraDays * RENEWAL_RATE_INR;

    await persistOrderIfChanged(order);
    await syncUserBlockState(user);

    return res.status(200).json({
      message: "We stretched that rental window for you.",
      order: makePublicOrder(order),
    });
  } catch (error) {
    console.error("Error renewing rental", error);
    return res.status(500).json({ message: "Failed to renew rental." });
  }
};

const performReturn = async ({ orderId, itemId, actingUserId, adminMode = false, session }) => {
  const orderQuery = adminMode
    ? Order.findById(orderId)
    : Order.findOne({ _id: orderId, userId: actingUserId });
  const order = await loadWithSession(orderQuery, session);

  if (!order) {
    throw createAppError(404, "Rental item not found.");
  }

  syncRentalOrder(order);
  const item = order.items.id(itemId);

  if (!item) {
    throw createAppError(404, "Rental item not found.");
  }

  if (item.returnedDate) {
    throw createAppError(400, "This rental item is already returned.");
  }

  const user = await loadWithSession(User.findById(order.userId), session);
  const book = await loadWithSession(Book.findById(item.bookId), session);

  if (!user || !book) {
    throw createAppError(404, "The related rental record could not be completed.");
  }

  item.returnedDate = new Date();
  item.status = "returned";
  await persistOrderIfChanged(order, session);

  book.stock += 1;
  book.currentPossessors = (book.currentPossessors || []).filter(
    (userId) => userId.toString() !== user._id.toString()
  );
  await book.save(session ? { session } : undefined);

  await syncUserBlockState(user, session);

  return { order, user };
};

const returnRentalItem = async (req, res) => {
  try {
    const { order, user } = await runWithOptionalTransaction((session) =>
      performReturn({
        orderId: req.params.orderId,
        itemId: req.params.itemId,
        actingUserId: req.user._id,
        session,
      })
    );

    return res.status(200).json({
      message: "We marked that book as returned.",
      order: makePublicOrder(order),
      userStanding: {
        pendingFines: user.pendingFines,
        accountStatus: user.accountStatus,
      },
    });
  } catch (error) {
    console.error("Error returning rental", error);
    return res.status(error.status || 500).json({
      message: error.message || "Failed to return book.",
    });
  }
};

const updateRentalItemAdmin = async (req, res) => {
  try {
    const { action, finePaid, fineWaived } = req.body;

    if (action === "return") {
      const { order } = await runWithOptionalTransaction((session) =>
        performReturn({
          orderId: req.params.orderId,
          itemId: req.params.itemId,
          actingUserId: req.user._id,
          adminMode: true,
          session,
        })
      );

      return res.status(200).json({
        message: "Rental record updated.",
        order: makePublicOrder(order),
      });
    }

    const order = await Order.findById(req.params.orderId);

    if (!order) {
      return res.status(404).json({ message: "Rental not found." });
    }

    syncRentalOrder(order);
    const item = order.items.id(req.params.itemId);

    if (!item) {
      return res.status(404).json({ message: "Rental item not found." });
    }

    if (finePaid !== undefined) {
      item.finePaid = normalizePositiveInteger(finePaid, item.finePaid);
    }

    if (fineWaived !== undefined) {
      item.fineWaived = normalizePositiveInteger(fineWaived, item.fineWaived);
    }

    await persistOrderIfChanged(order);

    const user = await User.findById(order.userId);
    if (user) {
      await syncUserBlockState(user);
    }

    return res.status(200).json({
      message: "Rental record updated.",
      order: makePublicOrder(order),
    });
  } catch (error) {
    console.error("Error updating admin rental record", error);
    return res.status(500).json({ message: "Failed to update rental record." });
  }
};

module.exports = {
  createAOrder,
  createInstantFreeRental,
  getMyOrders,
  getUserRentalStanding,
  renewRentalItem,
  returnRentalItem,
  syncUserBlockState,
  updateRentalItemAdmin,
};
