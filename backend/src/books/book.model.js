const mongoose = require("mongoose");

const bookSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    author: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    trending: {
      type: Boolean,
      default: false,
    },
    coverImage: {
      type: String,
      required: true,
      trim: true,
    },
    oldPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    newPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    sellerUsername: {
      type: String,
      required: true,
      trim: true,
    },
    documentName: {
      type: String,
      required: true,
      trim: true,
    },
    documentMimeType: {
      type: String,
      required: true,
      trim: true,
    },
    documentSize: {
      type: Number,
      required: true,
      min: 1,
    },
    documentStorageName: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

bookSchema.index({ title: "text", author: "text", description: "text" });
bookSchema.index({ category: 1, createdAt: -1 });

const Book = mongoose.model("Book", bookSchema);

module.exports = Book;
