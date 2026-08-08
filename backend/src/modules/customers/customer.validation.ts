import { z } from "zod";

export const customerTypeEnum = z.enum(["RETAIL", "WHOLESALE", "DISTRIBUTOR"]);
export const customerStatusEnum = z.enum(["LEAD", "ACTIVE", "INACTIVE"]);

export const createCustomerSchema = z.object({
  name: z.string().min(2, "Name is required"),
  mobile: z.string().min(7, "A valid mobile number is required"),
  email: z.string().email().optional().or(z.literal("")),
  businessName: z.string().optional(),
  gstNumber: z.string().optional(),
  customerType: customerTypeEnum,
  address: z.string().optional(),
  status: customerStatusEnum.optional().default("LEAD"),
  followUpDate: z.coerce.date().optional(),
  notes: z.string().optional(),
});

export const updateCustomerSchema = createCustomerSchema.partial();

export const listCustomersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  status: customerStatusEnum.optional(),
  customerType: customerTypeEnum.optional(),
});

export const addFollowUpSchema = z.object({
  note: z.string().min(1, "Note cannot be empty"),
});

export const idParamSchema = z.object({
  id: z.string().uuid("Invalid id"),
});
