import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, pool } from "../src/lib/db";
import { challanItems, customers, products, salesChallans, stockMovements, users } from "../src/db/schema";

// Seed password for every demo account. Documented in the README for
// reviewers; change or remove these accounts before any real deployment.
const SEED_PASSWORD = "Password123!";

async function upsertUser(name: string, email: string, role: "ADMIN" | "SALES" | "WAREHOUSE" | "ACCOUNTS") {
  const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (existing) return existing;
  const hashed = await bcrypt.hash(SEED_PASSWORD, 10);
  const [user] = await db.insert(users).values({ name, email, password: hashed, role }).returning();
  return user;
}

async function main() {
  console.log("Seeding database...");

  const admin = await upsertUser("Admin User", "admin@erpcrm.test", "ADMIN");
  const sales = await upsertUser("Sales User", "sales@erpcrm.test", "SALES");
  await upsertUser("Warehouse User", "warehouse@erpcrm.test", "WAREHOUSE");
  await upsertUser("Accounts User", "accounts@erpcrm.test", "ACCOUNTS");

  let [customer] = await db.select().from(customers).where(eq(customers.mobile, "9876543210")).limit(1);
  if (!customer) {
    [customer] = await db
      .insert(customers)
      .values({
        name: "Ramesh Traders",
        mobile: "9876543210",
        email: "ramesh@rameshtraders.example",
        businessName: "Ramesh Traders Pvt Ltd",
        gstNumber: "27ABCDE1234F1Z5",
        customerType: "WHOLESALE",
        address: "12 MG Road, Pune, Maharashtra",
        status: "ACTIVE",
        notes: "Long-standing distributor for the western region.",
      })
      .returning();
  }

  let [productA] = await db.select().from(products).where(eq(products.sku, "SKU-STEEL-001")).limit(1);
  if (!productA) {
    [productA] = await db
      .insert(products)
      .values({
        name: "Steel Pipe 2 inch",
        sku: "SKU-STEEL-001",
        category: "Pipes",
        unitPrice: "450.00",
        currentStock: 500,
        minStockAlert: 50,
        location: "Warehouse A - Rack 3",
      })
      .returning();
    await db.insert(stockMovements).values({
      productId: productA.id,
      quantity: 500,
      movementType: "IN",
      reason: "Initial stock load",
      createdById: admin.id,
    });
  }

  let [productB] = await db.select().from(products).where(eq(products.sku, "SKU-STEEL-002")).limit(1);
  if (!productB) {
    [productB] = await db
      .insert(products)
      .values({
        name: "Steel Pipe 4 inch",
        sku: "SKU-STEEL-002",
        category: "Pipes",
        unitPrice: "780.00",
        currentStock: 20,
        minStockAlert: 25,
        location: "Warehouse A - Rack 4",
      })
      .returning();
    await db.insert(stockMovements).values({
      productId: productB.id,
      quantity: 20,
      movementType: "IN",
      reason: "Initial stock load",
      createdById: admin.id,
    });
  }

  const [existingChallan] = await db
    .select()
    .from(salesChallans)
    .where(eq(salesChallans.challanNumber, "CH-DEMO-000001"))
    .limit(1);

  if (!existingChallan) {
    const [challan] = await db
      .insert(salesChallans)
      .values({
        challanNumber: "CH-DEMO-000001",
        customerId: customer.id,
        totalQuantity: 10,
        status: "DRAFT",
        createdById: sales.id,
      })
      .returning();

    await db.insert(challanItems).values({
      challanId: challan.id,
      productId: productA.id,
      productNameSnapshot: productA.name,
      productSkuSnapshot: productA.sku,
      unitPriceSnapshot: productA.unitPrice,
      quantity: 10,
    });
  }

  console.log("Seed complete.");
  console.log(`Demo login credentials (password for all: ${SEED_PASSWORD}):`);
  console.log("  Admin:      admin@erpcrm.test");
  console.log("  Sales:      sales@erpcrm.test");
  console.log("  Warehouse:  warehouse@erpcrm.test");
  console.log("  Accounts:   accounts@erpcrm.test");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });
