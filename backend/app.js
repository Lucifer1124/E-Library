const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const mongoSanitize = require("express-mongo-sanitize");

const bookRoutes = require("./src/books/book.route");
const orderRoutes = require("./src/orders/order.route");
const userRoutes = require("./src/users/user.route");
const adminRoutes = require("./src/stats/admin.stats");
const noteRoutes = require("./src/notes/common-note.route");

const createApp = () => {
  const app = express();

  app.use(
    cors({
      origin: ["http://localhost:5173", "https://book-app-frontend-tau.vercel.app"],
      credentials: true,
    })
  );
  app.use(cookieParser());
  app.use(express.json());
  app.use(mongoSanitize());

  app.use("/api/books", bookRoutes);
  app.use("/api/orders", orderRoutes);
  app.use("/api/auth", userRoutes);
  app.use("/api/admin", adminRoutes);
  app.use("/api/common-notes", noteRoutes);
  app.get("/", (req, res) => {
    res.send("Book Library Server is running!");
  });

  return app;
};

module.exports = { createApp };
