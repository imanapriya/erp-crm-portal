import { and, desc, eq, ilike, lte, or, SQL, sql } from "drizzle-orm";
import { db } from "../../lib/db";
import { products, stockMovements, users } from "../../db/schema";
import { AppError } from "../../utils/AppError";
import { paginationMeta } from "../../utils/pagination";

interface ListParams {
  page: number;
  pageSize: number;
  search?: string;
  category?: string;
  lowStockOnly?: boolean;
}

function buildWhere(params: ListParams): SQL | undefined {
  const conditions: SQL[] = [];
  if (params.category) conditions.push(eq(products.category, params.category));
  if (params.search) {
    const term = `%${params.search}%`;
    const searchClause = or(ilike(products.name, term), ilike(products.sku, term));
    if (searchClause) conditions.push(searchClause);
  }
  // currentStock <= minStockAlert compares two columns on the same row.
  if (params.lowStockOnly) {
    conditions.push(lte(products.currentStock, products.minStockAlert));
  }
  return conditions.length ? and(...conditions) : undefined;
}

export async function listProducts(params: ListParams) {
  const where = buildWhere(params);

  const items = await db
    .select()
    .from(products)
    .where(where)
    .orderBy(desc(products.createdAt))
    .limit(params.pageSize)
    .offset((params.page - 1) * params.pageSize);

  const totalRows = await db.select({ id: products.id }).from(products).where(where);

  return { items, meta: paginationMeta(totalRows.length, params.page, params.pageSize) };
}

export async function getProductById(id: string) {
  const [product] = await db.select().from(products).where(eq(products.id, id)).limit(1);
  if (!product) throw AppError.notFound("Product");
  return product;
}

export interface CreateProductInput {
  name: string;
  sku: string;
  category?: string;
  unitPrice: number;
  currentStock?: number;
  minStockAlert?: number;
  location?: string;
}

export async function createProduct(data: CreateProductInput) {
  const [product] = await db
    .insert(products)
    .values({ ...data, unitPrice: String(data.unitPrice) })
    .returning();
  return product;
}

export async function updateProduct(
  id: string,
  data: Partial<Omit<CreateProductInput, "currentStock">>
) {
  const [existing] = await db.select({ id: products.id }).from(products).where(eq(products.id, id)).limit(1);
  if (!existing) throw AppError.notFound("Product");

  const { unitPrice, ...rest } = data;
  const [product] = await db
    .update(products)
    .set({
      ...rest,
      ...(unitPrice !== undefined ? { unitPrice: String(unitPrice) } : {}),
      updatedAt: new Date(),
    })
    .where(eq(products.id, id))
    .returning();
  return product;
}

export async function getStockMovements(productId: string, page: number, pageSize: number) {
  const [existing] = await db.select({ id: products.id }).from(products).where(eq(products.id, productId)).limit(1);
  if (!existing) throw AppError.notFound("Product");

  const items = await db
    .select({
      id: stockMovements.id,
      productId: stockMovements.productId,
      quantity: stockMovements.quantity,
      movementType: stockMovements.movementType,
      reason: stockMovements.reason,
      createdAt: stockMovements.createdAt,
      createdByName: users.name,
    })
    .from(stockMovements)
    .innerJoin(users, eq(stockMovements.createdById, users.id))
    .where(eq(stockMovements.productId, productId))
    .orderBy(desc(stockMovements.createdAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  const totalRows = await db
    .select({ id: stockMovements.id })
    .from(stockMovements)
    .where(eq(stockMovements.productId, productId));

  return { items, meta: paginationMeta(totalRows.length, page, pageSize) };
}

/**
 * Records a manual stock movement (IN or OUT) and adjusts the product's
 * currentStock accordingly, inside a transaction so the log entry and the
 * balance never drift apart. OUT movements can never take stock negative.
 */
export async function recordStockMovement(
  productId: string,
  quantity: number,
  movementType: "IN" | "OUT",
  reason: string,
  createdById: string
) {
  return db.transaction(async (tx) => {
    const [product] = await tx.select().from(products).where(eq(products.id, productId)).limit(1);
    if (!product) throw AppError.notFound("Product");

    if (movementType === "OUT" && product.currentStock < quantity) {
      throw new AppError(
        `Insufficient stock for "${product.name}". Available: ${product.currentStock}, requested: ${quantity}`,
        409
      );
    }

    const delta = movementType === "IN" ? quantity : -quantity;

    const [updatedProduct] = await tx
      .update(products)
      .set({ currentStock: sql`${products.currentStock} + ${delta}`, updatedAt: new Date() })
      .where(eq(products.id, productId))
      .returning();

    const [movement] = await tx
      .insert(stockMovements)
      .values({ productId, quantity, movementType, reason, createdById })
      .returning();

    return { product: updatedProduct, movement };
  });
}
