const jwt = require("jsonwebtoken");
const User = require("./user.model");

const ADMIN_CREDENTIALS = {
  username: "ADMIN",
  password: "admin@12345",
};
const SESSION_COOKIE_NAME = "bookie_session";

const getJwtSecret = () => process.env.JWT_SECRET_KEY;

const sanitizeUser = (user) => ({
  id: user._id,
  username: user.username,
  role: user.role,
  accountStatus: user.accountStatus,
  pendingFines: user.pendingFines || 0,
  isBlocked: Boolean(user.isBlocked),
  blockReason: user.blockReason || "",
  createdAt: user.createdAt,
});

const createSessionToken = (user) =>
  jwt.sign(
    {
      sub: user._id.toString(),
      username: user.username,
      role: user.role,
    },
    getJwtSecret(),
    {
      expiresIn: "5d",
    }
  );

const getSessionCookieOptions = () => ({
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  maxAge: 5 * 24 * 60 * 60 * 1000,
});

const getSessionCookieClearOptions = () => ({
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
});

const cleanupLegacyUserIndexes = async () => {
  const collection = User.collection;
  const indexes = await collection.indexes();
  const emailIndex = indexes.find((index) => index.name === "email_1");

  if (emailIndex) {
    await collection.dropIndex("email_1");
  }
};

const ensureAdminUser = async () => {
  const existingAdmin = await User.findOne({
    usernameKey: ADMIN_CREDENTIALS.username.toLowerCase(),
  });

  if (!existingAdmin) {
    await User.create({
      username: ADMIN_CREDENTIALS.username,
      password: ADMIN_CREDENTIALS.password,
      role: "admin",
    });
    return;
  }

  existingAdmin.username = ADMIN_CREDENTIALS.username;
  existingAdmin.password = ADMIN_CREDENTIALS.password;
  existingAdmin.role = "admin";
  await existingAdmin.save();
};

module.exports = {
  ADMIN_CREDENTIALS,
  cleanupLegacyUserIndexes,
  createSessionToken,
  ensureAdminUser,
  getSessionCookieClearOptions,
  getSessionCookieOptions,
  SESSION_COOKIE_NAME,
  sanitizeUser,
};
