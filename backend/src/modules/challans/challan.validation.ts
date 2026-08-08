import { z } from "zod";

export const challanItemInputSchema = z.object({
  productId: z.string().uuid("Invalid product id"),
  quantity: z.coerce.number().int().positive("Quantity must be greater than zero"),
});

export const createChallanSchema = z.object({
  customerId: z.string().uuid("Invalid customer id"),
  items: z.array(challanItemInputSchema).min(1, "At least one product line is required"),
  status: z.enum(["DRAFT", "CONFIRMED"]).optional().default("DRAFT"),
});

export const updateChallanSchema = z.object({
  customerId: z.string().uuid("Invalid customer id").optional(),
  items: z.array(challanItemInputSchema).min(1).optional(),
});

export const listChallansQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(["DRAFT", "CONFIRMED", "CANCELLED"]).optional(),
  customerId: z.string().uuid().optional(),
  search: z.string().optional(),
});

export const idParamSchema = z.object({
  id: z.string().uuid("Invalid id"),
});
