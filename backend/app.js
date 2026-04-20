const express = require("express");
const cors = require("cors");

const bookRoutes = require("./src/books/book.route");
const orderRoutes = require("./src/orders/order.route");
const userRoutes = require("./src/users/user.route");
const adminRoutes = require("./src/stats/admin.stats");

const createApp = () => {
  const app = express();

  app.use(
    cors({
      origin: ["http://localhost:5173", "https://book-app-frontend-tau.vercel.app"],
      credentials: true,
    })
  );
  app.use(express.json());

  app.use("/api/books", bookRoutes);
  app.use("/api/orders", orderRoutes);
  app.use("/api/auth", userRoutes);
  app.use("/api/admin", adminRoutes);
  app.get("/", (req, res) => {
    res.send("Book Store Server is running!");
  });

  return app;
};

module.exports = { createApp };
