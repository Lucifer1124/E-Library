const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");

process.env.JWT_SECRET_KEY = process.env.JWT_SECRET_KEY || "test-secret-key";

const { createApp } = require("../app");
const User = require("../src/users/user.model");
const {
  createSessionToken,
  SESSION_COOKIE_NAME,
} = require("../src/users/user.service");

const originalFindOne = User.findOne;
const originalCreate = User.create;
const originalFindById = User.findById;

test.afterEach(() => {
  User.findOne = originalFindOne;
  User.create = originalCreate;
  User.findById = originalFindById;
});

test("registers a username/password customer successfully", async () => {
  const app = createApp();
  const createdUser = {
    _id: new mongoose.Types.ObjectId(),
    username: "reader1",
    role: "user",
    createdAt: new Date(),
  };

  User.findOne = async () => null;
  User.create = async ({ username, password, role }) => ({
    ...createdUser,
    username,
    role,
    password,
  });

  const response = await request(app).post("/api/auth/register").send({
    username: "reader1",
    password: "readerpass123",
  });

  assert.equal(response.status, 201);
  assert.equal(response.body.user.username, "reader1");
  assert.equal(response.body.user.role, "user");
  assert.match(response.headers["set-cookie"][0], new RegExp(`^${SESSION_COOKIE_NAME}=`));
});

test("rejects login when password comparison fails", async () => {
  const app = createApp();

  User.findOne = async () => ({
    _id: new mongoose.Types.ObjectId(),
    username: "reader1",
    role: "user",
    comparePassword: async () => false,
  });

  const response = await request(app).post("/api/auth/login").send({
    username: "reader1",
    password: "wrongpass",
  });

  assert.equal(response.status, 401);
  assert.equal(response.body.message, "Invalid credentials.");
});

test("returns the logged in user from /api/auth/me with a valid token", async () => {
  const app = createApp();
  const user = {
    _id: new mongoose.Types.ObjectId(),
    username: "reader1",
    role: "user",
    createdAt: new Date(),
  };
  const token = createSessionToken(user);

  User.findById = async () => user;

  const response = await request(app)
    .get("/api/auth/me")
    .set("Authorization", `Bearer ${token}`);

  assert.equal(response.status, 200);
  assert.equal(response.body.user.username, "reader1");
  assert.equal(response.body.user.role, "user");
});

test("login issues a cookie-backed JWT without sensitive payload fields", async () => {
  const app = createApp();
  const user = {
    _id: new mongoose.Types.ObjectId(),
    username: "reader1",
    role: "user",
    comparePassword: async () => true,
  };

  User.findOne = async () => user;

  const response = await request(app).post("/api/auth/login").send({
    username: "reader1",
    password: "readerpass123",
  });

  assert.equal(response.status, 200);
  assert.match(response.headers["set-cookie"][0], new RegExp(`^${SESSION_COOKIE_NAME}=`));

  const rawToken = response.headers["set-cookie"][0]
    .split(";")[0]
    .replace(`${SESSION_COOKIE_NAME}=`, "");
  const payload = jwt.verify(rawToken, process.env.JWT_SECRET_KEY);

  assert.equal(payload.username, "reader1");
  assert.equal(payload.role, "user");
  assert.equal(payload.password, undefined);
  assert.equal(payload.passwordHash, undefined);
});
