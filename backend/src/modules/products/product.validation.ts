import { z } from "zod";

export const createProductSchema = z.object({
  name: z.string().min(2, "Name is required"),
  sku: z.string().min(1, "SKU is required"),
  category: z.string().optional(),
  unitPrice: z.coerce.number().nonnegative("Unit price cannot be negative"),
  currentStock: z.coerce.number().int().nonnegative().optional().default(0),
  minStockAlert: z.coerce.number().int().nonnegative().optional().default(0),
  location: z.string().optional(),
});

export const updateProductSchema = createProductSchema.partial().omit({ currentStock: true });

export const listProductsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  category: z.string().optional(),
  lowStockOnly: z.coerce.boolean().optional().default(false),
});

export const stockMovementSchema = z.object({
  quantity: z.coerce.number().int().positive("Quantity must be greater than zero"),
  movementType: z.enum(["IN", "OUT"]),
  reason: z.string().min(1, "A reason is required"),
});

export const idParamSchema = z.object({
  id: z.string().uuid("Invalid id"),
});
