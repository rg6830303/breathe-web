import { z } from "zod";

const emailSchema = z.string().trim().toLowerCase().email("Enter a valid email address.");
const passwordSchema = z.string().min(8, "Password must be at least 8 characters.").max(200);

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required.").max(200),
});

export const signupSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(120),
  email: emailSchema,
  password: passwordSchema,
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9\s\-()]{7,20}$/, "Enter a valid phone number.")
    .optional()
    .or(z.literal("").transform(() => undefined)),
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  token: z.string().min(16).max(128),
  password: passwordSchema,
});

/** A single requested slot (with optional ±30-min extension duration). */
export const slotInputSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Bad date."),
  time: z.string().regex(/^\d{2}:\d{2}$/, "Bad time."),
  court: z.number().int().min(1).max(3),
  durationMin: z.number().int().min(30).max(180).optional(),
});

/** Body for a slot booking (paid order or prepaid-credit redeem). */
export const bookingRequestSchema = z.object({
  slots: z.array(slotInputSchema).min(1, "Select at least one slot.").max(20, "Too many slots."),
  addons: z
    .array(
      z.object({
        id: z.string().max(50),
        label: z.string().max(120),
        price: z.number().min(0).max(100000),
        qty: z.number().int().min(1).max(50).optional(),
      }),
    )
    .max(20)
    .optional()
    .default([]),
});

export function formatZodError(err: z.ZodError): string {
  const first = err.issues[0];
  return first ? first.message : "Invalid input.";
}
