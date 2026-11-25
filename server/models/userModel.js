// This file describes how a User is stored in the database.
// It also handles hashing the password before saving.

import mongoose from "mongoose";
import bcrypt from "bcryptjs";

// One product the user has put in their cart.
const cartItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    quantity: { type: Number, required: true, default: 1, min: 1 },
  },
  { _id: false }
);

// A shipping/billing address that belongs to the user.
const addressSchema = new mongoose.Schema(
  {
    label: { type: String, default: "Home" },
    fullName: String,
    phone: String,
    line1: String,
    line2: String,
    city: String,
    state: String,
    postalCode: String,
    country: { type: String, default: "India" },
    isDefault: { type: Boolean, default: false },
  },
  { _id: true }
);

// A saved refresh token (stored hashed) used to keep the user logged in.
const refreshTokenSchema = new mongoose.Schema(
  {
    tokenHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
  },
  { _id: true }
);

// The main user schema.
const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, "Name is required"], trim: true },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
      select: false,
    },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    isVerified: { type: Boolean, default: false },
    status: { type: String, enum: ["active", "suspended"], default: "active" },
    cart: [cartItemSchema],
    wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
    address: addressSchema,
    addresses: [addressSchema],
    refreshTokens: [refreshTokenSchema],
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
  },
  { timestamps: true }
);

// Index to make admin user lists faster.
userSchema.index({ status: 1, isDeleted: 1 });

// Before saving, hash the password (but only if it changed).
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Helper method to compare a typed password with the stored hash.
userSchema.methods.matchPassword = async function (entered) {
  return bcrypt.compare(entered, this.password);
};

const User = mongoose.model("User", userSchema);
export default User;
