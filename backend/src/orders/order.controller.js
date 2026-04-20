const mongoose = require("mongoose");
const Order = require("./order.model");
const Book = require("../books/book.model");

const createAOrder = async (req, res) => {
  try {
    const {
      contactName,
      phone,
      address,
      productIds = [],
      paymentMethod,
      demoCard,
    } = req.body;

    if (!contactName || !phone || !address) {
      return res
        .status(400)
        .json({ message: "Contact name, phone, and address are required." });
    }

    if (!["cash", "demo-card"].includes(paymentMethod)) {
      return res.status(400).json({ message: "Invalid payment method." });
    }

    if (!Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({ message: "At least one book is required." });
    }

    const uniqueIds = [...new Set(productIds)];
    const validIds = uniqueIds.filter((id) => mongoose.Types.ObjectId.isValid(id));

    const books = await Book.find({ _id: { $in: validIds } }).select(
      "title newPrice sellerUsername coverImage documentName documentMimeType documentStorageName"
    );

    if (books.length !== validIds.length) {
      return res
        .status(400)
        .json({ message: "Some selected books are no longer available." });
    }

    if (paymentMethod === "demo-card") {
      if (
        !demoCard?.cardNumber?.trim() ||
        !demoCard?.expiry?.trim() ||
        !demoCard?.cvc?.trim()
      ) {
        return res
          .status(400)
          .json({ message: "Demo card details are required for card checkout." });
      }
    }

    const items = books.map((book) => ({
      bookId: book._id,
      title: book.title,
      price: book.newPrice,
      sellerUsername: book.sellerUsername,
      coverImage: book.coverImage,
      documentName: book.documentName || "",
      documentMimeType: book.documentMimeType || "",
      hasDocument: Boolean(book.documentStorageName),
    }));

    const totalPrice = items.reduce((sum, item) => sum + item.price, 0);

    const order = await Order.create({
      userId: req.user._id,
      username: req.user.username,
      contactName: contactName.trim(),
      phone: phone.trim(),
      address: {
        street: address.street?.trim(),
        city: address.city?.trim(),
        country: address.country?.trim(),
        state: address.state?.trim(),
        zipcode: address.zipcode?.trim(),
      },
      items,
      totalPrice,
      paymentMethod,
      paymentStatus: paymentMethod === "cash" ? "pending" : "demo-approved",
      demoPayment:
        paymentMethod === "demo-card"
          ? {
              transactionId: `DEMO-${Date.now()}`,
              last4: demoCard.cardNumber.trim().slice(-4),
            }
          : undefined,
    });

    return res.status(201).json(order);
  } catch (error) {
    console.error("Error creating order", error);
    return res.status(500).json({ message: "Failed to create order." });
  }
};

const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .select("-__v")
      .lean();

    return res.status(200).json(orders);
  } catch (error) {
    console.error("Error fetching orders", error);
    return res.status(500).json({ message: "Failed to fetch orders." });
  }
};

module.exports = {
  createAOrder,
  getMyOrders,
};
