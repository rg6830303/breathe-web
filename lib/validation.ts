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
  // Per-slot sport so a cart can mix sports; falls back to the order-level sport.
  sport: z.enum(["pickleball", "cricket", "badminton"]).optional(),
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

/**
 * Tournament entry, filled in by anyone — player account or guest.
 *
 * Name/email/phone are collected on the form because a guest has no account to
 * read them from; for a logged-in player the server still prefers the account's
 * own name and email. `photo_url` is written by the upload route, never typed.
 */
export const tournamentRegistrationSchema = z
  .object({
    tournament_id: z.string().min(1, "Please choose a tournament.").max(64),
    player_name: z.string().trim().min(2, "Please enter your full name.").max(80),
    email: z.string().trim().toLowerCase().email("Please enter a valid email.").max(160),
    phone: z
      .string()
      .trim()
      .regex(/^[0-9+\-\s()]{7,20}$/, "Please enter a valid phone number."),
    age: z.coerce.number().int().min(8, "Age must be 8 or over.").max(99, "Please enter a valid age."),
    sex: z.enum(["male", "female", "other"], { message: "Please select your sex." }),
    photo_url: z.string().trim().max(200_000, "That photo is too large.").min(1, "Please upload a profile photo."),
    dupr_id: z.string().trim().max(40).optional().or(z.literal("")),
    dupr_level: z
      .string()
      .trim()
      .max(10)
      .regex(/^([0-9](\.[0-9]{1,2})?)?$/, "DUPR level looks like 3.5.")
      .optional()
      .or(z.literal("")),
    category: z.enum(["singles", "doubles", "mixed_doubles"]).optional().default("singles"),
    skill_level: z.enum(["beginner", "intermediate", "advanced"]).optional().default("intermediate"),
    partner_name: z.string().trim().max(80).optional().or(z.literal("")),
    notes: z.string().trim().max(500).optional().or(z.literal("")),
  });

export function formatZodError(err: z.ZodError): string {
  const first = err.issues[0];
  return first ? first.message : "Invalid input.";
}
