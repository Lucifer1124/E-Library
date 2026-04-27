const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const request = require("supertest");
const mongoose = require("mongoose");

process.env.JWT_SECRET_KEY = process.env.JWT_SECRET_KEY || "test-secret-key";

const { createApp } = require("../app");
const User = require("../src/users/user.model");
const Book = require("../src/books/book.model");
const Order = require("../src/orders/order.model");
const { createSessionToken } = require("../src/users/user.service");
const { getDocumentFilePath, removeUploadedDocument } = require("../src/books/book.upload");

const originalFindById = User.findById;
const originalBookCreate = Book.create;
const originalBookFindById = Book.findById;
const originalOrderExists = Order.exists;

let createdStorageNames = [];

test.afterEach(async () => {
  User.findById = originalFindById;
  Book.create = originalBookCreate;
  Book.findById = originalBookFindById;
  Order.exists = originalOrderExists;

  await Promise.all(createdStorageNames.map((storageName) => removeUploadedDocument(storageName)));
  createdStorageNames = [];
});

test("creates a book with purchased document metadata", async () => {
  const app = createApp();
  const user = {
    _id: new mongoose.Types.ObjectId(),
    username: "seller1",
    role: "user",
  };
  const token = createSessionToken(user);
  let createdPayload;

  User.findById = async () => user;
  Book.create = async (payload) => {
    createdPayload = payload;
    createdStorageNames.push(payload.documentStorageName);
    return {
      _id: new mongoose.Types.ObjectId(),
      ...payload,
      toObject() {
        return { _id: this._id, ...payload };
      },
    };
  };

  const response = await request(app)
    .post("/api/books/create-book")
    .set("Authorization", `Bearer ${token}`)
    .field("title", "Upload Ready Book")
    .field("author", "Seller One")
    .field("description", "A digital book with a purchased file.")
    .field("category", "fantasy")
    .field("coverImage", "https://example.com/cover.png")
    .field("oldPrice", "20")
    .field("newPrice", "12")
    .field("trending", "true")
    .attach("document", Buffer.from("hello buyer"), {
      filename: "sample.txt",
      contentType: "text/plain",
    });

  assert.equal(response.status, 201);
  assert.equal(response.body.book.documentName, "sample.txt");
  assert.equal(response.body.book.documentMimeType, "text/plain");
  assert.equal(response.body.book.documentStorageName, undefined);
  assert.equal(createdPayload.sellerUsername, "seller1");
  assert.equal(createdPayload.documentName, "sample.txt");
  assert.equal(createdPayload.documentMimeType, "text/plain");
  assert.ok(createdPayload.documentStorageName);
});

test("serves a purchased document to a buyer who owns the order", async () => {
  const app = createApp();
  const user = {
    _id: new mongoose.Types.ObjectId(),
    username: "buyer1",
    role: "user",
  };
  const token = createSessionToken(user);
  const bookId = new mongoose.Types.ObjectId();
  const sellerId = new mongoose.Types.ObjectId();
  const storageName = `test-${Date.now()}-book.txt`;
  const filePath = getDocumentFilePath(storageName);
  createdStorageNames.push(storageName);
  fs.writeFileSync(filePath, "Purchased content", "utf8");

  User.findById = async () => user;
  Book.findById = async () => ({
    _id: bookId,
    sellerId,
    documentName: "purchased.txt",
    documentMimeType: "text/plain",
    documentSize: Buffer.byteLength("Purchased content"),
    documentStorageName: storageName,
  });
  Order.exists = async () => true;

  const response = await request(app)
    .get(`/api/books/${bookId}/document`)
    .set("Authorization", `Bearer ${token}`);

  assert.equal(response.status, 200);
  assert.match(response.headers["content-type"], /^text\/plain/);
  assert.match(response.headers["content-disposition"], /inline; filename="purchased.txt"/);
  assert.equal(response.text, "Purchased content");
});

test("blocks document access when the user has not purchased the book", async () => {
  const app = createApp();
  const user = {
    _id: new mongoose.Types.ObjectId(),
    username: "buyer2",
    role: "user",
  };
  const token = createSessionToken(user);
  const bookId = new mongoose.Types.ObjectId();
  const sellerId = new mongoose.Types.ObjectId();

  User.findById = async () => user;
  Book.findById = async () => ({
    _id: bookId,
    sellerId,
    documentName: "blocked.pdf",
    documentMimeType: "application/pdf",
    documentSize: 10,
    documentStorageName: "blocked-storage.pdf",
  });
  Order.exists = async () => false;

  const response = await request(app)
    .get(`/api/books/${bookId}/document`)
    .set("Authorization", `Bearer ${token}`);

  assert.equal(response.status, 403);
  assert.equal(response.body.message, "Rent this book to access its document.");
});

test("rejects non-admin attempts to update trending state", async () => {
  const app = createApp();
  const user = {
    _id: new mongoose.Types.ObjectId(),
    username: "reader3",
    role: "user",
  };
  const token = createSessionToken(user);

  User.findById = async () => user;

  const response = await request(app)
    .patch(`/api/books/trending/${new mongoose.Types.ObjectId()}`)
    .set("Authorization", `Bearer ${token}`)
    .send({ trending: true });

  assert.equal(response.status, 403);
  assert.equal(response.body.message, "Forbidden. Admin access only.");
});
