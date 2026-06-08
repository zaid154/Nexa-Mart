import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const trackingEventSchema = new mongoose.Schema(
  {
    status: { type: String, required: true },
    note: String,
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const returnImageSchema = new mongoose.Schema(
  {
    data: { type: Buffer, required: true },
    contentType: { type: String, required: true },
  },
  { _id: true }
);

const adminNoteSchema = new mongoose.Schema(
  {
    note: { type: String, required: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    items: [orderItemSchema],
    shippingAddress: {
      fullName: String,
      phone: String,
      line1: String,
      line2: String,
      city: String,
      state: String,
      postalCode: String,
      country: { type: String, default: "India" },
    },
    itemsPrice: { type: Number, required: true, default: 0 },
    shippingPrice: { type: Number, required: true, default: 0 },
    taxPrice: { type: Number, required: true, default: 0 },
    discountPrice: { type: Number, required: true, default: 0 },
    couponCode: { type: String, default: "" },
    totalPrice: { type: Number, required: true, default: 0 },

    paymentMethod: { type: String, enum: ["razorpay", "cod"], default: "razorpay" },
    isPaid: { type: Boolean, default: false },
    paidAt: Date,
    paymentResult: {
      razorpayOrderId: String,
      razorpayPaymentId: String,
      razorpaySignature: String,
      status: String,
    },

    status: {
      type: String,
      enum: [
        "pending",
        "confirmed",
        "processing",
        "packed",
        "shipped",
        "out_for_delivery",
        "delivered",
        "cancelled",
        "return_requested",
        "return_approved",
        "return_rejected",
        "returned",
      ],
      default: "pending",
    },
    stockReduced: { type: Boolean, default: false },
    trackingHistory: [trackingEventSchema],
    deliveredAt: Date,

    returnInfo: {
      reason: String,
      description: String,
      images: [returnImageSchema],
      requestedAt: Date,
      processedAt: Date,
      adminNote: String,
    },

    refund: {
      status: {
        type: String,
        enum: ["none", "pending", "initiated", "processing", "completed", "failed"],
        default: "none",
      },
      amount: { type: Number, default: 0 },
      reason: String,
      transactionId: String,
      notes: String,
      initiatedAt: Date,
      completedAt: Date,
    },

    adminNotes: [adminNoteSchema],
  },
  { timestamps: true }
);

orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });

const Order = mongoose.model("Order", orderSchema);
export default Order;
