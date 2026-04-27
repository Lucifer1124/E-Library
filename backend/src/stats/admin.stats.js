const express = require("express");
const fs = require("fs");
const path = require("path");
const Order = require("../orders/order.model");
const Book = require("../books/book.model");
const User = require("../users/user.model");
const verifyAdminToken = require("../middleware/verifyAdminToken");
const {
  syncUserBlockState,
  updateRentalItemAdmin,
} = require("../orders/order.controller");
const { syncRentalOrder } = require("../orders/rental.service");

const router = express.Router();
const demoDataPath = path.join(__dirname, "../../demo_data.json");

const readDemoData = () => {
  try {
    const raw = fs.readFileSync(demoDataPath, "utf8");
    return JSON.parse(raw);
  } catch (error) {
    console.error("Unable to load demo admin data:", error);
    return { blockList: [], ghostTransactions: [] };
  }
};

const slugify = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const refreshAdminOrders = async (orders) => {
  await Promise.all(
    orders.map(async (order) => {
      syncRentalOrder(order);
      await order.save();
    })
  );
};

const buildActualTracking = (orders) =>
  orders
    .flatMap((rental) =>
      rental.items
        .filter((item) => !item.returnedDate)
        .map((item) => ({
          rentalId: rental._id,
          itemId: item._id,
          bookId: item.bookId,
          title: item.title,
          username: rental.username,
          userId: rental.userId,
          copyNumber: item.copyNumber,
          issueDate: item.issueDate,
          dueDate: item.dueDate,
          status: item.status,
          outstandingFine:
            (item.fineAccrued || 0) - (item.finePaid || 0) - (item.fineWaived || 0),
          isDemo: false,
        }))
    );

const buildActualHistory = (orders) =>
  orders.flatMap((rental) =>
    rental.items.map((item) => ({
      rentalId: rental._id,
      itemId: item._id,
      username: rental.username,
      userId: rental.userId,
      bookId: item.bookId,
      title: item.title,
      isFree: item.isFree,
      issueDate: item.issueDate,
      dueDate: item.dueDate,
      returnedDate: item.returnedDate,
      renewalDays: item.renewalDays,
      status: item.status,
      outstandingFine:
        (item.fineAccrued || 0) - (item.finePaid || 0) - (item.fineWaived || 0),
      isDemo: false,
    }))
  );

const buildActualLiveInventory = (books) =>
  books.map((book) => ({
    _id: book._id,
    title: book.title,
    stock: book.stock,
    currentPossessors: (book.currentPossessors || []).map((user) => ({
      _id: user._id,
      username: user.username,
      accountStatus: user.accountStatus,
      pendingFines: user.pendingFines,
      isDemo: false,
    })),
    isDemo: false,
  }));

const buildDemoUsers = (demoData) => {
  const activeCounts = demoData.ghostTransactions.reduce((map, entry) => {
    if (!entry.returnedDate) {
      map.set(entry.username, (map.get(entry.username) || 0) + 1);
    }

    return map;
  }, new Map());

  return demoData.blockList.map((entry) => ({
    _id: `demo-user-${slugify(entry.username)}`,
    username: entry.username,
    isBlocked: true,
    manualBlock: true,
    blockReason: entry.reason || "Policy Violation",
    blockedAt: new Date("2026-04-01T09:00:00.000Z").toISOString(),
    activeItemsCount: activeCounts.get(entry.username) || 0,
    outstandingFine: entry.pendingFine || 5000,
    isDemo: true,
  }));
};

const buildDemoHistory = (demoData) =>
  demoData.ghostTransactions.map((entry, index) => ({
    rentalId: `demo-rental-${index + 1}`,
    itemId: `demo-item-${index + 1}`,
    username: entry.username,
    userId: `demo-user-${slugify(entry.username)}`,
    bookId: `demo-book-${slugify(entry.title)}`,
    title: entry.title,
    isFree: false,
    issueDate: entry.issueDate,
    dueDate: entry.dueDate,
    returnedDate: entry.returnedDate,
    renewalDays: entry.renewalDays || 0,
    status: entry.returnedDate ? "returned" : "active",
    outstandingFine: entry.fine || 0,
    isDemo: true,
  }));

const buildDemoTracking = (demoHistory) =>
  demoHistory
    .filter((entry) => !entry.returnedDate)
    .map((entry, index) => ({
      rentalId: entry.rentalId,
      itemId: entry.itemId,
      bookId: entry.bookId,
      title: entry.title,
      username: entry.username,
      userId: entry.userId,
      copyNumber: index + 1,
      issueDate: entry.issueDate,
      dueDate: entry.dueDate,
      status: entry.status,
      outstandingFine: entry.outstandingFine,
      isDemo: true,
    }));

const buildDemoLiveInventory = (demoHistory, demoUsers) => {
  const demoUserMap = new Map(demoUsers.map((user) => [user.username, user]));
  const groupedByTitle = demoHistory.reduce((map, entry) => {
    if (entry.returnedDate) {
      return map;
    }

    const key = entry.title;
    const entries = map.get(key) || [];
    entries.push(entry);
    map.set(key, entries);
    return map;
  }, new Map());

  return [...groupedByTitle.entries()].map(([title, entries]) => ({
    _id: `demo-book-${slugify(title)}`,
    title,
    stock: 0,
    isDemo: true,
    currentPossessors: entries.map((entry) => {
      const demoUser = demoUserMap.get(entry.username);

      return {
        _id: entry.userId,
        username: entry.username,
        accountStatus: demoUser?.isBlocked ? "Blocked" : "Active",
        pendingFines: demoUser?.outstandingFine || entry.outstandingFine || 0,
        isDemo: true,
      };
    }),
  }));
};

const buildDemoBlocklist = (demoUsers) =>
  demoUsers.map((user) => ({
    _id: user._id,
    username: user.username,
    isBlocked: true,
    manualBlock: true,
    blockReason: user.blockReason,
    blockedAt: user.blockedAt,
    pendingFine: user.outstandingFine,
    isDemo: true,
  }));

const getAdminStats = async (_req, res) => {
  try {
    const demoData = readDemoData();
    const users = await User.find({ role: "user" });
    await Promise.all(users.map((user) => syncUserBlockState(user)));

    const inventoryBooks = await Book.find()
      .populate("currentPossessors", "username accountStatus pendingFines")
      .lean();

    const allOrders = await Order.find().sort({ createdAt: -1 });
    await refreshAdminOrders(allOrders);

    const actualTracking = buildActualTracking(allOrders);
    const actualHistory = buildActualHistory(allOrders);
    const actualLiveInventory = buildActualLiveInventory(inventoryBooks);
    const demoUsers = buildDemoUsers(demoData);
    const demoHistory = buildDemoHistory(demoData);
    const demoTracking = buildDemoTracking(demoHistory);
    const demoLiveInventory = buildDemoLiveInventory(demoHistory, demoUsers);
    const demoBlocklist = buildDemoBlocklist(demoUsers);

    const totalRentals = allOrders.length + demoHistory.length;
    const totalBooks = inventoryBooks.reduce((sum, book) => sum + (book.stock || 0), 0);
    const checkedOutBooks =
      actualTracking.length + demoTracking.length;
    const totalSellers = await User.countDocuments({ role: "user" });
    const totalOutstandingFines =
      allOrders.reduce((sum, rental) => sum + (rental.totalOutstandingFine || 0), 0) +
      demoHistory.reduce((sum, entry) => sum + (entry.outstandingFine || 0), 0);
    const totalRevenue = allOrders.reduce(
      (sum, rental) => sum + (rental.totalPrice || 0),
      0
    );

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

    const blocklist = [
      ...users
        .filter((user) => user.isBlocked || user.manualBlock)
        .map((user) => ({
          _id: user._id,
          username: user.username,
          isBlocked: user.isBlocked,
          manualBlock: user.manualBlock,
          blockReason: user.blockReason,
          blockedAt: user.blockedAt,
          pendingFine: user.pendingFines || 0,
          isDemo: false,
        })),
      ...demoBlocklist,
    ];

    const latestOrders = allOrders.slice(0, 5).map((rental) => ({
      _id: rental._id,
      username: rental.username,
      totalPrice: rental.totalPrice,
      paymentMethod: rental.paymentMethod,
      paymentStatus: rental.paymentStatus,
      createdAt: rental.createdAt,
    }));

    return res.status(200).json({
      totalRentals,
      totalBooks,
      checkedOutBooks,
      totalSellers,
      totalRevenue,
      totalOutstandingFines,
      monthlySales,
      latestOrders,
      tracking: [...actualTracking, ...demoTracking].slice(0, 20),
      history: [...actualHistory, ...demoHistory]
        .sort((left, right) => new Date(right.issueDate) - new Date(left.issueDate))
        .slice(0, 30),
      blocklist,
      liveInventory: [...actualLiveInventory, ...demoLiveInventory].slice(0, 20),
      demoUsers,
    });
  } catch (error) {
    console.error("Error fetching admin library stats:", error);
    return res.status(500).json({ message: "Failed to fetch library overview." });
  }
};

router.get("/", verifyAdminToken, getAdminStats);
router.get("/stats", verifyAdminToken, getAdminStats);

router.get("/users", verifyAdminToken, async (_req, res) => {
  try {
    const users = await User.find({ role: "user" }).sort({ createdAt: -1 });
    const demoData = readDemoData();
    const demoUsers = buildDemoUsers(demoData);

    const results = await Promise.all(
      users.map(async (user) => {
        const standing = await syncUserBlockState(user);

        return {
          _id: user._id,
          username: user.username,
          isBlocked: user.isBlocked,
          manualBlock: user.manualBlock,
          blockReason: user.blockReason,
          blockedAt: user.blockedAt,
          activeItemsCount: standing.activeItemsCount,
          outstandingFine: standing.outstandingFine,
          isDemo: false,
        };
      })
    );

    return res.status(200).json([...demoUsers, ...results]);
  } catch (error) {
    console.error("Error fetching library users:", error);
    return res.status(500).json({ message: "Failed to fetch library users." });
  }
});

router.patch("/users/:userId/block", verifyAdminToken, async (req, res) => {
  try {
    if (String(req.params.userId).startsWith("demo-user-")) {
      return res.status(400).json({ message: "Demo profiles are read-only in this preview." });
    }

    const user = await User.findById(req.params.userId);

    if (!user || user.role !== "user") {
      return res.status(404).json({ message: "User not found." });
    }

    const standing = await syncUserBlockState(user);

    if (standing.activeItemsCount === 0 && standing.outstandingFine === 0) {
      return res.status(400).json({
        message: "This user has no active liabilities to justify a manual block right now.",
      });
    }

    user.manualBlock = true;
    user.isBlocked = true;
    user.accountStatus = "Blocked";
    user.blockReason = req.body.reason?.trim() || "Manually blocked by admin.";
    user.blockedAt = new Date();
    await user.save();

    return res.status(200).json({
      message: "User added to blocklist.",
      user,
    });
  } catch (error) {
    console.error("Error blocking user:", error);
    return res.status(500).json({ message: "Failed to block user." });
  }
});

router.patch("/users/:userId/unblock", verifyAdminToken, async (req, res) => {
  try {
    if (String(req.params.userId).startsWith("demo-user-")) {
      return res.status(400).json({ message: "Demo profiles are read-only in this preview." });
    }

    const user = await User.findById(req.params.userId);

    if (!user || user.role !== "user") {
      return res.status(404).json({ message: "User not found." });
    }

    user.manualBlock = false;
    await syncUserBlockState(user);

    return res.status(200).json({
      message: "User blocklist status updated.",
      user,
    });
  } catch (error) {
    console.error("Error unblocking user:", error);
    return res.status(500).json({ message: "Failed to unblock user." });
  }
});

router.get("/history/:userId", verifyAdminToken, async (req, res) => {
  try {
    if (String(req.params.userId).startsWith("demo-user-")) {
      const demoData = readDemoData();
      const demoHistory = buildDemoHistory(demoData).filter(
        (entry) => entry.userId === req.params.userId
      );
      return res.status(200).json(demoHistory);
    }

    const orders = await Order.find({ userId: req.params.userId }).sort({ createdAt: -1 });
    await refreshAdminOrders(orders);

    return res.status(200).json(
      orders.flatMap((rental) =>
        rental.items.map((item) => ({
          rentalId: rental._id,
          itemId: item._id,
          title: item.title,
          bookId: item.bookId,
          issueDate: item.issueDate,
          dueDate: item.dueDate,
          returnedDate: item.returnedDate,
          status: item.status,
          renewalDays: item.renewalDays,
          outstandingFine:
            (item.fineAccrued || 0) - (item.finePaid || 0) - (item.fineWaived || 0),
        }))
      )
    );
  } catch (error) {
    console.error("Error fetching user rental history:", error);
    return res.status(500).json({ message: "Failed to fetch user rental history." });
  }
});

router.patch(
  "/rentals/:orderId/items/:itemId",
  verifyAdminToken,
  updateRentalItemAdmin
);

module.exports = router;
