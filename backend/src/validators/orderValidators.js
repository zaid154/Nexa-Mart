// Validation rules for placing an order and for saving an address.
//
// Until now nothing between the browser and the database ever looked at a
// shipping address: there was no schema on the route, and every field on the
// Order and User models is a bare String. A phone number of twenty digits went
// straight through and got stored. These rules are mirrored field-for-field by
// frontend/src/utils/address.js; change one, change the other.
//
// Deliberately enforced here at the edge and NOT as `match` on the Mongoose
// schemas: existing seeded users and orders hold addresses that would fail
// these patterns, and a model-level constraint would make those documents
// unsaveable for unrelated reasons.

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
    // The checkout used to send this under the wrong key, so every order was
    // created as razorpay whatever the shopper picked. Naming it here means a
    // future mismatch is a 400 rather than a silent wrong order.
    paymentMethod: z
      .enum(["razorpay", "cod"], { message: "Choose a valid payment method" })
      .default("razorpay"),
    idempotencyKey: optionalText(100, "Idempotency key"),
  }),
});

// Rules for PUT /api/auth/profile. Every key the controller reads has to be
// listed: Zod strips what it does not know, and the middleware replaces
// req.body with the parsed result, so an omitted key would silently vanish.
export const updateProfileSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2, "Name must be at least 2 characters").max(60).optional(),
    // Left as a plain string on purpose — the controller runs the shared
    // strongPassword() check and returns its own message.
    password: z.string().optional(),
    address: addressSchema.optional(),
    addresses: z.array(addressSchema).max(10, "You can save up to 10 addresses").optional(),
  }),
});
