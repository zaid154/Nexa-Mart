import { z } from "zod";

const email = z.string().email("Invalid email");
const password = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Must include uppercase")
  .regex(/[a-z]/, "Must include lowercase")
  .regex(/[0-9]/, "Must include a number");

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
