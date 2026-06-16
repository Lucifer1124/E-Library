const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const mongoose = require("mongoose");

process.env.JWT_SECRET_KEY = process.env.JWT_SECRET_KEY || "test-secret-key";

const { createApp } = require("../app");
const User = require("../src/users/user.model");
const Order = require("../src/orders/order.model");
const { createSessionToken } = require("../src/users/user.service");
const { addDays } = require("../src/orders/rental.service");

const originalUserFindById = User.findById;
const originalOrderFind = Order.find;
const originalOrderFindOne = Order.findOne;

test.afterEach(() => {
  User.findById = originalUserFindById;
  Order.find = originalOrderFind;
  Order.findOne = originalOrderFindOne;
});

const buildUser = (overrides = {}) => ({
  _id: new mongoose.Types.ObjectId(),
  username: "reader1",
  role: "user",
  accountStatus: "Active",
  pendingFines: 0,
  payLaterBill: 0,
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

const buildOrder = (user, itemOverrides = {}, orderOverrides = {}) => {
  const issueDate = itemOverrides.issueDate || addDays(new Date(), -2);
  const dueDate = itemOverrides.dueDate || addDays(issueDate, 5);
  const order = new Order({
    userId: user._id,
    username: user.username,
    contactName: "Reader One",
    phone: "1234567890",
    address: {
      street: "1 Library Street",
      city: "Booktown",
      country: "India",
      state: "WB",
      zipcode: "700001",
    },
    items: [
      {
        bookId: new mongoose.Types.ObjectId(),
        title: "Test Book",
        price: 20,
        sellerUsername: "seller1",
        coverImage: "cover.png",
        hasDocument: true,
        issueDate,
        dueDate,
        renewalDays: 0,
        renewalFeePerDay: 2,
        status: "active",
        fineAccrued: 0,
        finePaid: 0,
        fineWaived: 0,
        ...itemOverrides,
      },
    ],
    rentalDays: 5,
    renewalFeePerDay: 2,
    totalPrice: 20,
    totalOutstandingFine: 0,
    paymentMethod: "cash",
    paymentStatus: "pending",
    ...orderOverrides,
  });

  order.save = async function save() {
    return this;
  };

  return order;
};

const mountPaymentMocks = ({ user, order }) => {
  User.findById = async () => user;
  Order.find = async () => [order];
  Order.findOne = async () => order;
  return createSessionToken(user);
};

test("pays pending fines through the payment route", async () => {
  const app = createApp();
  const user = buildUser({ pendingFines: 50 });
  const issueDate = addDays(new Date(), -10);
  const order = buildOrder(user, {
    issueDate,
    dueDate: addDays(issueDate, 5),
    status: "overdue",
    fineAccrued: 50,
  });
  const token = mountPaymentMocks({ user, order });

  const response = await request(app)
    .post("/api/payments/fines")
    .set("Authorization", `Bearer ${token}`)
    .send({ amount: 20, paymentMethod: "gateway" });

  assert.equal(response.status, 200);
  assert.equal(response.body.amountPaid, 20);
  assert.equal(response.body.remainingFine, user.pendingFines);
  assert.equal(order.items[0].finePaid, 20);
});

test("renews a rental with immediate payment", async () => {
  const app = createApp();
  const user = buildUser();
  const order = buildOrder(user);
  const itemId = order.items[0]._id.toString();
  const token = mountPaymentMocks({ user, order });

  const response = await request(app)
    .post("/api/payments/renewal")
    .set("Authorization", `Bearer ${token}`)
    .send({ orderId: order._id.toString(), itemId, extraDays: 3, paymentMethod: "gateway" });

  assert.equal(response.status, 200);
  assert.equal(response.body.renewalCost, 6);
  assert.equal(order.items[0].renewalDays, 3);
  assert.equal(order.totalPrice, 26);
});

test("renews a rental by adding the charge to the user's pay-later bill", async () => {
  const app = createApp();
  const user = buildUser({ payLaterBill: 5 });
  const order = buildOrder(user);
  const itemId = order.items[0]._id.toString();
  const token = mountPaymentMocks({ user, order });

  const response = await request(app)
    .post("/api/payments/renewal/pay-later")
    .set("Authorization", `Bearer ${token}`)
    .send({ orderId: order._id.toString(), itemId, extraDays: 2 });

  assert.equal(response.status, 200);
  assert.equal(response.body.renewalCost, 4);
  assert.equal(response.body.payLaterBill, 9);
  assert.equal(order.items[0].renewalPaymentMethod, "pay-later");
});

test("settles the user's pay-later bill", async () => {
  const app = createApp();
  const user = buildUser({ payLaterBill: 12 });
  const order = buildOrder(user);
  const token = mountPaymentMocks({ user, order });

  const response = await request(app)
    .post("/api/payments/pay-later/settle")
    .set("Authorization", `Bearer ${token}`)
    .send({ amount: 7, paymentMethod: "gateway" });

  assert.equal(response.status, 200);
  assert.equal(response.body.amountPaid, 7);
  assert.equal(response.body.remainingBill, 5);
  assert.equal(user.payLaterBill, 5);
});

test("returns payment history and current balances", async () => {
  const app = createApp();
  const user = buildUser({ pendingFines: 10, payLaterBill: 4 });
  const issueDate = addDays(new Date(), -7);
  const order = buildOrder(user, {
    issueDate,
    dueDate: addDays(issueDate, 5),
    returnedDate: new Date(),
    fineAccrued: 20,
    finePaid: 10,
    status: "returned",
  });
  const token = mountPaymentMocks({ user, order });
  Order.find = () => ({
    sort: async () => [order],
  });

  const response = await request(app)
    .get("/api/payments/history")
    .set("Authorization", `Bearer ${token}`);

  assert.equal(response.status, 200);
  assert.equal(response.body.currentPendingFines, 10);
  assert.equal(response.body.currentPayLaterBill, 4);
  assert.equal(response.body.history.length, 1);
  assert.equal(response.body.history[0].type, "return");
});
