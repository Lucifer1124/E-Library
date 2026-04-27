const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    username: {
      type: String,
      required: true,
      trim: true,
    },
    contactName: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    address: {
      street: {
        type: String,
        required: true,
        trim: true,
      },
      city: {
        type: String,
        required: true,
        trim: true,
      },
      country: {
        type: String,
        required: true,
        trim: true,
      },
      state: {
        type: String,
        required: true,
        trim: true,
      },
      zipcode: {
        type: String,
        required: true,
        trim: true,
      },
    },
    items: [
      {
        bookId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Book",
          required: true,
        },
        title: {
          type: String,
          required: true,
        },
        price: {
          type: Number,
          required: true,
        },
        sellerUsername: {
          type: String,
          required: true,
        },
        coverImage: {
          type: String,
          required: true,
        },
        documentName: {
          type: String,
          default: "",
          trim: true,
        },
        documentMimeType: {
          type: String,
          default: "",
          trim: true,
        },
        hasDocument: {
          type: Boolean,
          required: true,
          default: true,
        },
        isFree: {
          type: Boolean,
          default: false,
        },
        copyNumber: {
          type: Number,
          default: null,
          min: 1,
        },
        issueDate: {
          type: Date,
          required: true,
        },
        dueDate: {
          type: Date,
          required: true,
        },
        returnedDate: {
          type: Date,
          default: null,
        },
        renewalDays: {
          type: Number,
          required: true,
          default: 0,
          min: 0,
        },
        renewalFeePerDay: {
          type: Number,
          required: true,
          default: 2,
          min: 0,
        },
        status: {
          type: String,
          enum: ["active", "overdue", "returned"],
          default: "active",
        },
        fineAccrued: {
          type: Number,
          default: 0,
          min: 0,
        },
        finePaid: {
          type: Number,
          default: 0,
          min: 0,
        },
        fineWaived: {
          type: Number,
          default: 0,
          min: 0,
        },
      },
    ],
    rentalDays: {
      type: Number,
      required: true,
      default: 5,
      min: 5,
    },
    renewalFeePerDay: {
      type: Number,
      required: true,
      default: 2,
      min: 0,
    },
    totalOutstandingFine: {
      type: Number,
      default: 0,
      min: 0,
    },
    orderType: {
      type: String,
      default: "rental",
      enum: ["rental"],
    },
    totalPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    paymentMethod: {
      type: String,
      enum: ["cash", "demo-card"],
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "demo-approved"],
      required: true,
    },
    demoPayment: {
      transactionId: String,
      last4: String,
    },
  },
  {
    timestamps: true,
  }
);

const Order = mongoose.model("Order", orderSchema);

module.exports = Order;
