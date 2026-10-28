// Zod schemas shared by forms (client) and server actions.
import { z } from "zod";

const phone = z
  .string()
  .trim()
  .refine((v) => v.replace(/\D/g, "").replace(/^92/, "").replace(/^0/, "").length === 10, "Enter a Pakistani mobile number, e.g. 0300 1234567");

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(1, "Enter your password"),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const applySchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name").max(120),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  phone,
  whatsapp: z.union([phone, z.literal("")]).optional(),
  city: z.string().trim().min(2, "Enter your city").max(60),
  cnic: z
    .string()
    .trim()
    .regex(/^(\d{5}-\d{7}-\d)?$/, "Use the format 12345-1234567-1")
    .optional(),
  note: z.string().trim().max(1000, "Keep it under 1000 characters").optional(),
});
export type ApplyInput = z.infer<typeof applySchema>;

export const PAYMENT_METHODS = [
  { value: "bank_transfer", label: "Bank transfer" },
  { value: "cash", label: "Cash" },
  { value: "jazzcash", label: "JazzCash" },
  { value: "easypaisa", label: "EasyPaisa" },
  { value: "other", label: "Other" },
] as const;

export const paymentSchema = z.object({
  dealId: z.string().min(1, "Choose the deal"),
  amount: z
    .string()
    .trim()
    .transform((v) => Number(v.replace(/[,\s]/g, "")))
    .refine((n) => Number.isInteger(n) && n > 0, "Enter the amount in rupees"),
  paidOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose the date"),
  method: z.enum(["bank_transfer", "cash", "jazzcash", "easypaisa", "other"]),
  note: z.string().trim().max(500).optional(),
});

const optionalText = (max: number) => z.string().trim().max(max).optional().or(z.literal("").transform(() => undefined));
const optionalPhone = z.union([phone, z.literal("")]).optional();

export const LEAD_STATUSES = ["new", "contacted", "interested", "not_interested", "converted", "lost"] as const;

export const leadSchema = z.object({
  clientName: z.string().trim().min(1, "Enter the contact's name").max(120),
  businessName: optionalText(120),
  phone,
  whatsapp: optionalPhone,
  city: optionalText(60),
  source: optionalText(60),
  services: z.array(z.string().uuid()).default([]),
  nextFollowUpAt: optionalText(30),
  notes: optionalText(2000),
});
export type LeadInput = z.input<typeof leadSchema>;

export const clientSchema = z.object({
  name: z.string().trim().min(1, "Enter the client's name").max(120),
  businessName: optionalText(120),
  phone,
  whatsapp: optionalPhone,
  email: z.union([z.string().trim().toLowerCase().email("Enter a valid email"), z.literal("")]).optional(),
  city: optionalText(60),
});
export type ClientInput = z.input<typeof clientSchema>;

export const dealSchema = z
  .object({
    clientId: z.string().uuid("Choose the client"),
    serviceId: z.string().uuid("Choose the service"),
    dealType: z.enum(["one_time", "monthly"]),
    amount: z
      .union([z.string(), z.number()])
      .transform((v) => Number(String(v).replace(/[,\s]/g, "")))
      .refine((n) => Number.isInteger(n) && n > 0, "Enter the amount in rupees"),
    startMonth: optionalText(10),
    description: optionalText(1000),
    nextFollowUpAt: optionalText(30),
  })
  .refine((d) => d.dealType === "one_time" || /^\d{4}-\d{2}-01$/.test(d.startMonth ?? ""), {
    message: "Choose the month the package starts",
    path: ["startMonth"],
  });
export type DealInput = z.input<typeof dealSchema>;

export const profileSchema = z.object({
  phone,
  whatsapp: optionalPhone,
  city: optionalText(60),
});
