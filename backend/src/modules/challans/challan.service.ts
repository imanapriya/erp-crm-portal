import { and, desc, eq, ilike, inArray, SQL, sql } from "drizzle-orm";
import { db } from "../../lib/db";
import { challanItems, customers, products, salesChallans, stockMovements, users } from "../../db/schema";
import { AppError } from "../../utils/AppError";
import { paginationMeta } from "../../utils/pagination";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

interface ItemInput {
  productId: string;
  quantity: number;
}

/** Generates the next sequential challan number, scoped to the current year, inside the given transaction. */
async function generateChallanNumberTx(tx: Tx): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `CH-${year}-`;

  const countRows = await tx
    .select({ id: salesChallans.id })
    .from(salesChallans)
    .where(ilike(salesChallans.challanNumber, `${prefix}%`));

  let sequence = countRows.length + 1;
  let candidate = `${prefix}${String(sequence).padStart(6, "0")}`;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const [existing] = await tx
      .select({ id: salesChallans.id })
      .from(salesChallans)
      .where(eq(salesChallans.challanNumber, candidate))
      .limit(1);
    if (!existing) return candidate;
    sequence += 1;
    candidate = `${prefix}${String(sequence).padStart(6, "0")}`;
  }
}

/** Loads the products referenced by challan line items and fails loudly if any id is unknown. */
async function loadProductsForItems(tx: Tx, items: ItemInput[]) {
  const productIds = items.map((i) => i.productId);
  const rows = await tx.select().from(products).where(inArray(products.id, productIds));
  const byId = new Map(rows.map((p) => [p.id, p]));

  const missing = productIds.filter((id) => !byId.has(id));
  if (missing.length > 0) {
    throw new AppError(`Unknown product id(s): ${missing.join(", ")}`, 400);
  }
  return byId;
}

/** Verifies every requested quantity is available; throws a single AppError describing every shortfall. */
function assertSufficientStock(
  items: ItemInput[],
  byId: Map<string, { name: string; currentStock: number }>
) {
  const shortages = items
    .map((item) => {
      const product = byId.get(item.productId)!;
      return product.currentStock < item.quantity
        ? `${product.name} (available: ${product.currentStock}, requested: ${item.quantity})`
        : null;
    })
    .filter((x): x is string => x !== null);

  if (shortages.length > 0) {
    throw new AppError(`Insufficient stock for: ${shortages.join("; ")}`, 409);
  }
}

interface CreateChallanParams {
  customerId: string;
  items: ItemInput[];
  status: "DRAFT" | "CONFIRMED";
  createdById: string;
}

/**
 * Creates a sales challan. Product name/SKU/price are always snapshotted onto
 * the challan items at creation time (per the business requirement), even for
 * drafts, so a later product edit never rewrites challan history.
 *
 * If created directly as CONFIRMED, stock is checked and reduced atomically
 * inside a single transaction — the challan, its items, the stock decrement,
 * and the stock movement log all commit or fail together. Stock can never go
 * negative: an insufficient line item aborts the entire transaction.
 */
export async function createChallan(params: CreateChallanParams) {
  const { customerId, items, status, createdById } = params;

  return db.transaction(async (tx) => {
    const [customer] = await tx.select().from(customers).where(eq(customers.id, customerId)).limit(1);
    if (!customer) throw AppError.notFound("Customer");

    const productsById = await loadProductsForItems(tx, items);

    if (status === "CONFIRMED") {
      assertSufficientStock(items, productsById);
    }

    const challanNumber = await generateChallanNumberTx(tx);
    const totalQuantity = items.reduce((sum, i) => sum + i.quantity, 0);

    const [challan] = await tx
      .insert(salesChallans)
      .values({ challanNumber, customerId, totalQuantity, status, createdById })
      .returning();

    const insertedItems = await tx
      .insert(challanItems)
      .values(
        items.map((item) => {
          const product = productsById.get(item.productId)!;
          return {
            challanId: challan.id,
            productId: product.id,
            productNameSnapshot: product.name,
            productSkuSnapshot: product.sku,
            unitPriceSnapshot: product.unitPrice,
            quantity: item.quantity,
          };
        })
      )
      .returning();

    if (status === "CONFIRMED") {
      for (const item of items) {
        await tx
          .update(products)
          .set({ currentStock: sql`${products.currentStock} - ${item.quantity}`, updatedAt: new Date() })
          .where(eq(products.id, item.productId));

        await tx.insert(stockMovements).values({
          productId: item.productId,
          quantity: item.quantity,
          movementType: "OUT",
          reason: `Sales challan ${challanNumber} confirmed`,
          createdById,
        });
      }
    }

    return { ...challan, items: insertedItems, customer };
  });
}

interface ListParams {
  page: number;
  pageSize: number;
  status?: "DRAFT" | "CONFIRMED" | "CANCELLED";
  customerId?: string;
  search?: string;
}

function buildListWhere(params: ListParams): SQL | undefined {
  const conditions: SQL[] = [];
  if (params.status) conditions.push(eq(salesChallans.status, params.status));
  if (params.customerId) conditions.push(eq(salesChallans.customerId, params.customerId));
  if (params.search) conditions.push(ilike(salesChallans.challanNumber, `%${params.search}%`));
  return conditions.length ? and(...conditions) : undefined;
}

export async function listChallans(params: ListParams) {
  const where = buildListWhere(params);

  const rows = await db
    .select({
      id: salesChallans.id,
      challanNumber: salesChallans.challanNumber,
      customerId: salesChallans.customerId,
      totalQuantity: salesChallans.totalQuantity,
      status: salesChallans.status,
      createdById: salesChallans.createdById,
      createdAt: salesChallans.createdAt,
      updatedAt: salesChallans.updatedAt,
      customerName: customers.name,
      customerBusinessName: customers.businessName,
    })
    .from(salesChallans)
    .innerJoin(customers, eq(salesChallans.customerId, customers.id))
    .where(where)
    .orderBy(desc(salesChallans.createdAt))
    .limit(params.pageSize)
    .offset((params.page - 1) * params.pageSize);

  const totalRows = await db.select({ id: salesChallans.id }).from(salesChallans).where(where);

  // Attach line items for the current page only (avoids N+1 across the whole table).
  const challanIds = rows.map((r) => r.id);
  const items =
    challanIds.length > 0
      ? await db.select().from(challanItems).where(inArray(challanItems.challanId, challanIds))
      : [];
  const itemsByChallanId = new Map<string, typeof items>();
  for (const item of items) {
    const list = itemsByChallanId.get(item.challanId) ?? [];
    list.push(item);
    itemsByChallanId.set(item.challanId, list);
  }

  const withItems = rows.map((row) => ({
    ...row,
    customer: { name: row.customerName, businessName: row.customerBusinessName },
    items: itemsByChallanId.get(row.id) ?? [],
  }));

  return { items: withItems, meta: paginationMeta(totalRows.length, params.page, params.pageSize) };
}

export async function getChallanById(id: string) {
  const [challan] = await db.select().from(salesChallans).where(eq(salesChallans.id, id)).limit(1);
  if (!challan) throw AppError.notFound("Sales challan");

  const [customer] = await db.select().from(customers).where(eq(customers.id, challan.customerId)).limit(1);
  const [createdBy] = await db
    .select({ name: users.name, email: users.email })
    .from(users)
    .where(eq(users.id, challan.createdById))
    .limit(1);

  const items = await db
    .select({
      id: challanItems.id,
      challanId: challanItems.challanId,
      productId: challanItems.productId,
      productNameSnapshot: challanItems.productNameSnapshot,
      productSkuSnapshot: challanItems.productSkuSnapshot,
      unitPriceSnapshot: challanItems.unitPriceSnapshot,
      quantity: challanItems.quantity,
      product: products,
    })
    .from(challanItems)
    .leftJoin(products, eq(challanItems.productId, products.id))
    .where(eq(challanItems.challanId, id));

  return { ...challan, customer, createdBy, items };
}

/** Replaces the customer/items on a DRAFT challan. Confirmed/cancelled challans are immutable. */
export async function updateChallan(id: string, data: { customerId?: string; items?: ItemInput[] }) {
  return db.transaction(async (tx) => {
    const [existing] = await tx.select().from(salesChallans).where(eq(salesChallans.id, id)).limit(1);
    if (!existing) throw AppError.notFound("Sales challan");
    if (existing.status !== "DRAFT") {
      throw new AppError(`Only DRAFT challans can be edited (current status: ${existing.status})`, 409);
    }

    if (data.items) {
      const productsById = await loadProductsForItems(tx, data.items);
      await tx.delete(challanItems).where(eq(challanItems.challanId, id));
      await tx.insert(challanItems).values(
        data.items.map((item) => {
          const product = productsById.get(item.productId)!;
          return {
            challanId: id,
            productId: product.id,
            productNameSnapshot: product.name,
            productSkuSnapshot: product.sku,
            unitPriceSnapshot: product.unitPrice,
            quantity: item.quantity,
          };
        })
      );
    }

    const [updated] = await tx
      .update(salesChallans)
      .set({
        ...(data.customerId ? { customerId: data.customerId } : {}),
        ...(data.items ? { totalQuantity: data.items.reduce((sum, i) => sum + i.quantity, 0) } : {}),
        updatedAt: new Date(),
      })
      .where(eq(salesChallans.id, id))
      .returning();

    const items = await tx.select().from(challanItems).where(eq(challanItems.challanId, id));
    return { ...updated, items };
  });
}

/**
 * Transitions a DRAFT challan to CONFIRMED: re-validates stock against the
 * challan's current line items and reduces stock atomically. This is the
 * same stock-safety guarantee as creating a challan pre-confirmed.
 */
export async function confirmChallan(id: string, confirmedById: string) {
  return db.transaction(async (tx) => {
    const [challan] = await tx.select().from(salesChallans).where(eq(salesChallans.id, id)).limit(1);
    if (!challan) throw AppError.notFound("Sales challan");
    if (challan.status !== "DRAFT") {
      throw new AppError(`Only DRAFT challans can be confirmed (current status: ${challan.status})`, 409);
    }

    const lineItems = await tx.select().from(challanItems).where(eq(challanItems.challanId, id));
    const items: ItemInput[] = lineItems.map((i) => ({ productId: i.productId as string, quantity: i.quantity }));
    const productsById = await loadProductsForItems(tx, items);
    assertSufficientStock(items, productsById);

    for (const item of items) {
      await tx
        .update(products)
        .set({ currentStock: sql`${products.currentStock} - ${item.quantity}`, updatedAt: new Date() })
        .where(eq(products.id, item.productId));

      await tx.insert(stockMovements).values({
        productId: item.productId,
        quantity: item.quantity,
        movementType: "OUT",
        reason: `Sales challan ${challan.challanNumber} confirmed`,
        createdById: confirmedById,
      });
    }

    const [updated] = await tx
      .update(salesChallans)
      .set({ status: "CONFIRMED", updatedAt: new Date() })
      .where(eq(salesChallans.id, id))
      .returning();

    return { ...updated, items: lineItems };
  });
}

/**
 * Cancels a challan. If it was already CONFIRMED (stock had been reduced),
 * the reserved stock is returned via IN movements so the ledger stays
 * accurate. DRAFT challans never touched stock, so cancelling one is a
 * plain status change.
 */
export async function cancelChallan(id: string, cancelledById: string) {
  return db.transaction(async (tx) => {
    const [challan] = await tx.select().from(salesChallans).where(eq(salesChallans.id, id)).limit(1);
    if (!challan) throw AppError.notFound("Sales challan");
    if (challan.status === "CANCELLED") {
      throw new AppError("Challan is already cancelled", 409);
    }

    const lineItems = await tx.select().from(challanItems).where(eq(challanItems.challanId, id));

    if (challan.status === "CONFIRMED") {
      for (const item of lineItems) {
        if (!item.productId) continue;
        await tx
          .update(products)
          .set({ currentStock: sql`${products.currentStock} + ${item.quantity}`, updatedAt: new Date() })
          .where(eq(products.id, item.productId));

        await tx.insert(stockMovements).values({
          productId: item.productId,
          quantity: item.quantity,
          movementType: "IN",
          reason: `Sales challan ${challan.challanNumber} cancelled - stock returned`,
          createdById: cancelledById,
        });
      }
    }

    const [updated] = await tx
      .update(salesChallans)
      .set({ status: "CANCELLED", updatedAt: new Date() })
      .where(eq(salesChallans.id, id))
      .returning();

    return { ...updated, items: lineItems };
  });
}
