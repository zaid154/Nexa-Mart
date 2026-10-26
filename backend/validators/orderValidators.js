// Validation schema for orders, addresses, and profile updates
import { z } from "zod";

// Indian mobile numbers are ten digits and never start below 6.
const PHONE_PATTERN = /^[6-9]\d{9}$/;
// Indian PIN codes are six digits and never start with 0.
const PINCODE_PATTERN = /^[1-9]\d{5}$/;

// Optional free text: accepts a missing value or an empty string.
const optionalText = (max, label) =>
  z.string().trim().max(max, `${label} must be ${max} characters or less`).optional();

export const addressSchema = z.object({
  // Saved addresses come back with their subdocument id; keep it so updating
  // the list does not make Mongoose mint new ids for untouched entries.
  _id: z.string().optional(),
  label: optionalText(30, "Label"),
  fullName: z
    .string()
    .trim()
    .min(2, "Full name is required")
    .max(60, "Name must be 60 characters or less"),
  phone: z
    .string()
    .trim()
    .regex(PHONE_PATTERN, "Mobile number must be 10 digits and start with 6, 7, 8 or 9"),
  line1: z
    .string()
    .trim()
    .min(5, "Address must include the house or street details")
    .max(120, "Address must be 120 characters or less"),
  line2: optionalText(120, "Landmark"),
  city: z.string().trim().min(2, "City is required").max(60, "City must be 60 characters or less"),
  state: z.string().trim().min(2, "State is required").max(60, "State must be 60 characters or less"),
  postalCode: z.string().trim().regex(PINCODE_PATTERN, "Pincode must be 6 digits and cannot start with 0"),
  country: z.string().trim().min(2, "Country is required").max(60).default("India"),
  isDefault: z.boolean().optional(),
});

// Rules for POST /api/orders.
export const createOrderSchema = z.object({
  body: z.object({
    shippingAddress: addressSchema,
    couponCode: optionalText(40, "Coupon code"),
    paymentMethod: z
      .enum(["razorpay", "cod"], { message: "Choose a valid payment method" })
      .default("razorpay"),
    idempotencyKey: optionalText(100, "Idempotency key"),
  }),
});
