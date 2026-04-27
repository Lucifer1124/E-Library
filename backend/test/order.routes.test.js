const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const mongoose = require("mongoose");

process.env.JWT_SECRET_KEY = process.env.JWT_SECRET_KEY || "test-secret-key";

const { createApp } = require("../app");
const User = require("../src/users/user.model");
const Book = require("../src/books/book.model");
const Order = require("../src/orders/order.model");
const { createSessionToken } = require("../src/users/user.service");

const originalStartSession = mongoose.startSession;
const originalFindById = User.findById;
const originalBookFind = Book.find;
const originalBookFindOneAndUpdate = Book.findOneAndUpdate;
const originalOrderFind = Order.find;
const originalOrderFindOne = Order.findOne;
const originalOrderSave = Order.prototype.save;

const makeStandaloneSession = async () => ({
  withTransaction: async () => {
    throw new Error("Standalone servers do not support transactions");
  },
  endSession: async () => {},
});

test.afterEach(() => {
  mongoose.startSession = originalStartSession;
  User.findById = originalFindById;
  Book.find = originalBookFind;
  Book.findOneAndUpdate = originalBookFindOneAndUpdate;
  Order.find = originalOrderFind;
  Order.findOne = originalOrderFindOne;
  Order.prototype.save = originalOrderSave;
});

const buildUser = (overrides = {}) => ({
  _id: new mongoose.Types.ObjectId(),
  username: "reader1",
  role: "user",
  accountStatus: "Active",
  pendingFines: 0,
  rentedBooks: [],
  activeRentals: [],
  manualBlock: false,
  isBlocked: false,
  save: async function save() {
    return this;
  },
  isModified: () => true,
  ...overrides,
});

const buildBook = (overrides = {}) => ({
  _id: new mongoose.Types.ObjectId(),
  title: "Demo Book",
  newPrice: 20,
  sellerId: new mongoose.Types.ObjectId(),
  sellerUsername: "seller1",
  coverImage: "https://example.com/book.png",
  documentName: "demo-book.pdf",
  documentMimeType: "application/pdf",
  documentStorageName: "demo-book-storage.pdf",
  isFree: false,
  stock: 1,
  currentPossessors: [],
  ...overrides,
});

test("rejects checkout when demo-card details are missing", async () => {
  const app = createApp();
  const user = buildUser();
  const token = createSessionToken(user);
  const book = buildBook();
  const savedOrders = [];

  mongoose.startSession = makeStandaloneSession;
  User.findById = async () => user;
  Order.find = async () => savedOrders;
  Book.find = () => ({
    select: async () => [book],
  });
  Book.findOneAndUpdate = async () => ({
    ...book,
    stock: 0,
    currentPossessors: [user._id],
  });
  Order.prototype.save = async function save() {
    savedOrders.push(this);
    return this;
  };

  const response = await request(app)
    .post("/api/orders")
    .set("Authorization", `Bearer ${token}`)
    .send({
      contactName: "Reader One",
      phone: "9999999999",
      address: {
        street: "Main street",
        city: "Kolkata",
        country: "India",
        state: "WB",
        zipcode: "700001",
      },
      productIds: [book._id.toString()],
      paymentMethod: "demo-card",
    });

  assert.equal(response.status, 400);
  assert.equal(response.body.message, "Demo card details are required for card checkout.");
});

test("rejects checkout when item ids are malformed", async () => {
  const app = createApp();
  const user = buildUser();
  const token = createSessionToken(user);
  User.findById = async () => user;

  const response = await request(app)
    .post("/api/orders")
    .set("Authorization", `Bearer ${token}`)
    .send({
      contactName: "Reader One",
      phone: "9999999999",
      address: {
        street: "Main street",
        city: "Kolkata",
        country: "India",
        state: "WB",
        zipcode: "700001",
      },
      productIds: ["not-a-book-id"],
      paymentMethod: "cash",
    });

  assert.equal(response.status, 400);
  assert.equal(response.body.message, "We couldn't process this rental - missing item details.");
});

test("creates a rental successfully and syncs possession state", async () => {
  const app = createApp();
  const user = buildUser();
  const token = createSessionToken(user);
  const book = buildBook({ stock: 2 });
  const savedOrders = [];

  mongoose.startSession = makeStandaloneSession;
  User.findById = async () => user;
  Order.find = async () => savedOrders;
  Book.find = () => ({
    select: async () => [book],
  });
  Book.findOneAndUpdate = async () => ({
    ...book,
    stock: 1,
    currentPossessors: [user._id],
  });
  Order.prototype.save = async function save() {
    if (!savedOrders.includes(this)) {
      savedOrders.push(this);
    }
    return this;
  };

  const response = await request(app)
    .post("/api/orders")
    .set("Authorization", `Bearer ${token}`)
    .send({
      contactName: "Reader One",
      phone: "9999999999",
      address: {
        street: "Main street",
        city: "Kolkata",
        country: "India",
        state: "WB",
        zipcode: "700001",
      },
      productIds: [book._id.toString()],
      paymentMethod: "cash",
      renewalDays: 2,
    });

  assert.equal(response.status, 201);
  assert.equal(response.body.paymentMethod, "cash");
  assert.equal(response.body.totalPrice, 24);
  assert.equal(response.body.items[0].documentName, "demo-book.pdf");
  assert.equal(response.body.items[0].copyNumber, 1);
  assert.equal(user.rentedBooks.length, 1);
  assert.equal(user.activeRentals.length, 1);
});

test("rejects renting your own listing", async () => {
  const app = createApp();
  const user = buildUser();
  const token = createSessionToken(user);
  const book = buildBook({ sellerId: user._id });
  const savedOrders = [];

  mongoose.startSession = makeStandaloneSession;
  User.findById = async () => user;
  Order.find = async () => savedOrders;
  Book.find = () => ({
    select: async () => [book],
  });
  Book.findOneAndUpdate = async () => null;
  Order.prototype.save = async function save() {
    savedOrders.push(this);
    return this;
  };

  const response = await request(app)
    .post("/api/orders")
    .set("Authorization", `Bearer ${token}`)
    .send({
      contactName: "Reader One",
      phone: "9999999999",
      address: {
        street: "Main street",
        city: "Kolkata",
        country: "India",
        state: "WB",
        zipcode: "700001",
      },
      productIds: [book._id.toString()],
      paymentMethod: "cash",
    });

  assert.equal(response.status, 403);
  assert.equal(response.body.message, "You cannot rent your own listing.");
});

test("allows only one of five simultaneous renters to reserve a single-stock book", async () => {
  const app = createApp();
  const sharedBook = buildBook({ stock: 1 });
  const users = Array.from({ length: 5 }, (_, index) =>
    buildUser({
      _id: new mongoose.Types.ObjectId(),
      username: `reader${index + 1}`,
    })
  );
  const tokens = users.map((user) => createSessionToken(user));
  let availableStock = 1;
  const savedOrders = [];

  mongoose.startSession = makeStandaloneSession;
  User.findById = async (userId) => users.find((user) => user._id.toString() === userId.toString());
  Order.find = async () => savedOrders;
  Book.find = () => ({
    select: async () => [{ ...sharedBook, stock: availableStock }],
  });
  Book.findOneAndUpdate = async (query) => {
    if (availableStock < 1 || query.sellerId?.$ne === undefined) {
      return null;
    }

    availableStock -= 1;
    return {
      ...sharedBook,
      stock: availableStock,
      currentPossessors: [query.currentPossessors.$ne],
    };
  };
  Order.prototype.save = async function save() {
    if (!savedOrders.includes(this)) {
      savedOrders.push(this);
    }
    return this;
  };

  const responses = await Promise.all(
    tokens.map((token, index) =>
      request(app)
        .post("/api/orders")
        .set("Authorization", `Bearer ${token}`)
        .send({
          contactName: `Reader ${index + 1}`,
          phone: "9999999999",
          address: {
            street: "Main street",
            city: "Kolkata",
            country: "India",
            state: "WB",
            zipcode: "700001",
          },
          productIds: [sharedBook._id.toString()],
          paymentMethod: "cash",
        })
    )
  );

  const successCount = responses.filter((response) => response.status === 201).length;
  const outOfStockCount = responses.filter(
    (response) => response.body.message === "Book Out of Stock"
  ).length;

  assert.equal(successCount, 1);
  assert.equal(outOfStockCount, 4);
});
