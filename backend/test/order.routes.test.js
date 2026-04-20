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

const originalFindById = User.findById;
const originalBookFind = Book.find;
const originalOrderCreate = Order.create;

test.afterEach(() => {
  User.findById = originalFindById;
  Book.find = originalBookFind;
  Order.create = originalOrderCreate;
});

test("rejects checkout when demo-card details are missing", async () => {
  const app = createApp();
  const user = {
    _id: new mongoose.Types.ObjectId(),
    username: "reader1",
    role: "user",
  };
  const token = createSessionToken(user);
  const bookId = new mongoose.Types.ObjectId().toString();

  User.findById = async () => user;
  Book.find = () => ({
    select: async () => [
      {
        _id: bookId,
        title: "Demo Book",
        newPrice: 20,
        sellerUsername: "seller1",
        coverImage: "https://example.com/book.png",
        documentName: "demo-book.pdf",
        documentMimeType: "application/pdf",
        documentStorageName: "demo-book-storage.pdf",
      },
    ],
  });

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
      productIds: [bookId],
      paymentMethod: "demo-card",
    });

  assert.equal(response.status, 400);
  assert.equal(response.body.message, "Demo card details are required for card checkout.");
});

test("creates a cash on delivery order successfully", async () => {
  const app = createApp();
  const user = {
    _id: new mongoose.Types.ObjectId(),
    username: "reader1",
    role: "user",
  };
  const token = createSessionToken(user);
  const bookId = new mongoose.Types.ObjectId();

  User.findById = async () => user;
  Book.find = () => ({
    select: async () => [
      {
        _id: bookId,
        title: "Demo Book",
        newPrice: 20,
        sellerUsername: "seller1",
        coverImage: "https://example.com/book.png",
        documentName: "demo-book.pdf",
        documentMimeType: "application/pdf",
        documentStorageName: "demo-book-storage.pdf",
      },
    ],
  });
  Order.create = async (payload) => ({
    _id: new mongoose.Types.ObjectId(),
    ...payload,
  });

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
      productIds: [bookId.toString()],
      paymentMethod: "cash",
    });

  assert.equal(response.status, 201);
  assert.equal(response.body.paymentMethod, "cash");
  assert.equal(response.body.paymentStatus, "pending");
  assert.equal(response.body.totalPrice, 20);
  assert.equal(response.body.items[0].documentName, "demo-book.pdf");
  assert.equal(response.body.items[0].hasDocument, true);
});

test("creates an order for a legacy book that has no uploaded document yet", async () => {
  const app = createApp();
  const user = {
    _id: new mongoose.Types.ObjectId(),
    username: "reader1",
    role: "user",
  };
  const token = createSessionToken(user);
  const bookId = new mongoose.Types.ObjectId();

  User.findById = async () => user;
  Book.find = () => ({
    select: async () => [
      {
        _id: bookId,
        title: "Legacy Book",
        newPrice: 15,
        sellerUsername: "seller1",
        coverImage: "https://example.com/book.png",
      },
    ],
  });
  Order.create = async (payload) => ({
    _id: new mongoose.Types.ObjectId(),
    ...payload,
  });

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
      productIds: [bookId.toString()],
      paymentMethod: "cash",
    });

  assert.equal(response.status, 201);
  assert.equal(response.body.items[0].documentName, "");
  assert.equal(response.body.items[0].documentMimeType, "");
  assert.equal(response.body.items[0].hasDocument, false);
});
