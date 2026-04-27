const express = require("express");
const User = require("./user.model");
const {
  createSessionToken,
  getSessionCookieClearOptions,
  getSessionCookieOptions,
  sanitizeUser,
  SESSION_COOKIE_NAME,
} = require("./user.service");
const verifyToken = require("../middleware/verifyToken");

const router = express.Router();

router.post("/register", async (req, res) => {
  try {
    const username = req.body?.username?.trim();
    const password = req.body?.password?.trim();

    if (!username || !password) {
      return res
        .status(400)
        .json({ message: "Username and password are required." });
    }

    if (password.length < 8) {
      return res
        .status(400)
        .json({ message: "Password must be at least 8 characters long." });
    }

    const existingUser = await User.findOne({
      usernameKey: username.toLowerCase(),
    });

    if (existingUser) {
      return res.status(409).json({ message: "Username already exists." });
    }

    const user = await User.create({
      username,
      password,
      role: "user",
    });

    const token = createSessionToken(user);

    res.cookie(SESSION_COOKIE_NAME, token, getSessionCookieOptions());

    return res.status(201).json({
      message: "Account created successfully.",
      user: sanitizeUser(user),
    });
  } catch (error) {
    console.error("Failed to register user", error);
    return res.status(500).json({ message: "Failed to register user." });
  }
});

router.post("/login", async (req, res) => {
  try {
    const username = req.body?.username?.trim();
    const password = req.body?.password?.trim();

    if (!username || !password) {
      return res
        .status(400)
        .json({ message: "Username and password are required." });
    }

    const user = await User.findOne({
      usernameKey: username.toLowerCase(),
    });

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    const token = createSessionToken(user);

    res.cookie(SESSION_COOKIE_NAME, token, getSessionCookieOptions());

    return res.status(200).json({
      message: "Authentication successful.",
      user: sanitizeUser(user),
    });
  } catch (error) {
    console.error("Failed to login user", error);
    return res.status(500).json({ message: "Failed to login user." });
  }
});

router.get("/me", verifyToken, async (req, res) => {
  return res.status(200).json({ user: sanitizeUser(req.user) });
});

router.post("/logout", verifyToken, async (req, res) => {
  res.clearCookie(SESSION_COOKIE_NAME, getSessionCookieClearOptions());
  return res.status(200).json({ message: "Logged out successfully." });
});

module.exports = router;
