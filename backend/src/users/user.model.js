const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 30,
    },
    usernameKey: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 8,
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    accountStatus: {
      type: String,
      enum: ["Active", "Blocked"],
      default: "Active",
    },
    pendingFines: {
      type: Number,
      default: 0,
      min: 0,
    },
    rentedBooks: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Book",
      },
    ],
    activeRentals: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Order",
      },
    ],
    isBlocked: {
      type: Boolean,
      default: false,
    },
    manualBlock: {
      type: Boolean,
      default: false,
    },
    blockReason: {
      type: String,
      default: "",
      trim: true,
    },
    blockedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

userSchema.pre("validate", function setUsernameKey(next) {
  if (this.username) {
    this.usernameKey = this.username.trim().toLowerCase();
  }
  next();
});

userSchema.pre("save", async function hashPassword(next) {
  if (!this.isModified("password")) {
    return next();
  }

  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.comparePassword = function comparePassword(password) {
  return bcrypt.compare(password, this.password);
};

const User = mongoose.model("User", userSchema);

module.exports = User;
