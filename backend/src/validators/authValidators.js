// Authentication and profile request validation schemas

import { z } from "zod";
import { addressSchema } from "./orderValidators.js";

const email = z.string().email("Invalid email");

const password = z
  .string()
  .min(6, "Password must be at least 6 characters");

export const registerSchema = z.object({
  body: z.object({ name: z.string().min(2), email, password }),
});

export const loginSchema = z.object({
  body: z.object({ email, password: z.string().min(1) }),
});

export const verifyOtpSchema = z.object({
  body: z.object({ email, code: z.string().length(6, "OTP must be 6 digits") }),
});

export const forgotPasswordSchema = z.object({
  body: z.object({ email }),
});

export const resetPasswordSchema = z.object({
  body: z.object({ email, code: z.string().min(4), password }),
});

export const updateProfileSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2, "Name must be at least 2 characters").max(60).optional(),
    password: z.string().optional(),
    address: addressSchema.optional(),
    addresses: z.array(addressSchema).max(10, "You can save up to 10 addresses").optional(),
  }),
});
