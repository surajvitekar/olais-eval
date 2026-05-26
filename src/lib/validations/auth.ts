import { z } from "zod"

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
})

export const registerSchema = z.object({
  inviteCode: z.string().uuid("Invalid invite code"),
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  phone: z.string().optional(),
  college: z.string().optional(),
})

export const inviteCreateSchema = z.object({
  count: z.number().int().min(1).max(100).default(1),
  maxUses: z.number().int().min(1).max(10).default(1),
  expiryDays: z.number().int().min(1).max(365).default(30),
})

export type LoginInput = z.infer<typeof loginSchema>
export type RegisterInput = z.infer<typeof registerSchema>
export type InviteCreateInput = z.infer<typeof inviteCreateSchema>
