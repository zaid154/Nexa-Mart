// This file defines the validation rules for the auth routes using Zod.
// These rules check the request body before the controller runs.

import { z } from "zod";

// Email must be a valid email address.
const email = z.string().email("Invalid email");

// Password rules: at least 8 chars, with uppercase, lowercase and a number.
const password = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Must include uppercase")
  .regex(/[a-z]/, "Must include lowercase")
  .regex(/[0-9]/, "Must include a number");

// Rules for creating a new account.
export const registerSchema = z.object({
  body: z.object({ name: z.string().min(2), email, password }),
});

// Rules for logging in. Here we only require that a password was typed.
export const loginSchema = z.object({
  body: z.object({ email, password: z.string().min(1) }),
});

// Rules for verifying an email with a 6-digit OTP.
export const verifyOtpSchema = z.object({
  body: z.object({ email, code: z.string().length(6, "OTP must be 6 digits") }),
});

// Rules for the "forgot password" request (just an email).
export const forgotPasswordSchema = z.object({
  body: z.object({ email }),
});

// Rules for resetting the password with a code and a new password.
export const resetPasswordSchema = z.object({
  body: z.object({ email, code: z.string().min(4), password }),
});
