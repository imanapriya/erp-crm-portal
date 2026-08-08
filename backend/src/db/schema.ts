import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  integer,
  numeric,
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

export const roleEnum = pgEnum("role", ["ADMIN", "SALES", "WAREHOUSE", "ACCOUNTS"]);
export const customerTypeEnum = pgEnum("customer_type", ["RETAIL", "WHOLESALE", "DISTRIBUTOR"]);
export const customerStatusEnum = pgEnum("customer_status", ["LEAD", "ACTIVE", "INACTIVE"]);
export const movementTypeEnum = pgEnum("movement_type", ["IN", "OUT"]);
export const challanStatusEnum = pgEnum("challan_status", ["DRAFT", "CONFIRMED", "CANCELLED"]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  password: text("password").notNull(),
  role: roleEnum("role").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const customers = pgTable("customers", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  mobile: varchar("mobile", { length: 32 }).notNull(),
  email: varchar("email", { length: 255 }),
  businessName: varchar("business_name", { length: 255 }),
  gstNumber: varchar("gst_number", { length: 32 }),
  customerType: customerTypeEnum("customer_type").notNull(),
  address: text("address"),
  status: customerStatusEnum("status").notNull().default("LEAD"),
  followUpDate: timestamp("follow_up_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const followUps = pgTable("follow_ups", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: uuid("customer_id")
    .notNull()
    .references(() => customers.id, { onDelete: "cascade" }),
  note: text("note").notNull(),
  createdById: uuid("created_by_id")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const products = pgTable("products", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  sku: varchar("sku", { length: 64 }).notNull().unique(),
  category: varchar("category", { length: 128 }),
  unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
  currentStock: integer("current_stock").notNull().default(0),
  minStockAlert: integer("min_stock_alert").notNull().default(0),
  location: varchar("location", { length: 255 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const stockMovements = pgTable("stock_movements", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id),
  quantity: integer("quantity").notNull(),
  movementType: movementTypeEnum("movement_type").notNull(),
  reason: text("reason").notNull(),
  createdById: uuid("created_by_id")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const salesChallans = pgTable("sales_challans", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  challanNumber: varchar("challan_number", { length: 64 }).notNull().unique(),
  customerId: uuid("customer_id")
    .notNull()
    .references(() => customers.id),
  totalQuantity: integer("total_quantity").notNull(),
  status: challanStatusEnum("status").notNull().default("DRAFT"),
  createdById: uuid("created_by_id")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// productNameSnapshot / productSkuSnapshot / unitPriceSnapshot preserve the
// product's data exactly as it was at the moment the challan was created, so
// later edits (or deletion) of the Product record never rewrite history.
export const challanItems = pgTable("challan_items", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  challanId: uuid("challan_id")
    .notNull()
    .references(() => salesChallans.id, { onDelete: "cascade" }),
  productId: uuid("product_id").references(() => products.id),
  productNameSnapshot: varchar("product_name_snapshot", { length: 255 }).notNull(),
  productSkuSnapshot: varchar("product_sku_snapshot", { length: 64 }).notNull(),
  unitPriceSnapshot: numeric("unit_price_snapshot", { precision: 12, scale: 2 }).notNull(),
  quantity: integer("quantity").notNull(),
});

// ---- Relations (used for nested `with:` queries) ----

export const usersRelations = relations(users, ({ many }) => ({
  challans: many(salesChallans),
  stockMovements: many(stockMovements),
  followUps: many(followUps),
}));

export const customersRelations = relations(customers, ({ many }) => ({
  followUps: many(followUps),
  challans: many(salesChallans),
}));

export const followUpsRelations = relations(followUps, ({ one }) => ({
  customer: one(customers, { fields: [followUps.customerId], references: [customers.id] }),
  createdBy: one(users, { fields: [followUps.createdById], references: [users.id] }),
}));

export const productsRelations = relations(products, ({ many }) => ({
  stockMovements: many(stockMovements),
  challanItems: many(challanItems),
}));

export const stockMovementsRelations = relations(stockMovements, ({ one }) => ({
  product: one(products, { fields: [stockMovements.productId], references: [products.id] }),
  createdBy: one(users, { fields: [stockMovements.createdById], references: [users.id] }),
}));

export const salesChallansRelations = relations(salesChallans, ({ one, many }) => ({
  customer: one(customers, { fields: [salesChallans.customerId], references: [customers.id] }),
  createdBy: one(users, { fields: [salesChallans.createdById], references: [users.id] }),
  items: many(challanItems),
}));

export const challanItemsRelations = relations(challanItems, ({ one }) => ({
  challan: one(salesChallans, { fields: [challanItems.challanId], references: [salesChallans.id] }),
  product: one(products, { fields: [challanItems.productId], references: [products.id] }),
}));
