import { and, desc, eq, ilike, or, SQL } from "drizzle-orm";
import { db } from "../../lib/db";
import { customers, followUps, salesChallans, users } from "../../db/schema";
import { AppError } from "../../utils/AppError";
import { paginationMeta } from "../../utils/pagination";

interface ListParams {
  page: number;
  pageSize: number;
  search?: string;
  status?: "LEAD" | "ACTIVE" | "INACTIVE";
  customerType?: "RETAIL" | "WHOLESALE" | "DISTRIBUTOR";
}

function buildWhere(params: ListParams): SQL | undefined {
  const conditions: SQL[] = [];
  if (params.status) conditions.push(eq(customers.status, params.status));
  if (params.customerType) conditions.push(eq(customers.customerType, params.customerType));
  if (params.search) {
    const term = `%${params.search}%`;
    const searchClause = or(
      ilike(customers.name, term),
      ilike(customers.mobile, term),
      ilike(customers.email, term),
      ilike(customers.businessName, term),
      ilike(customers.gstNumber, term)
    );
    if (searchClause) conditions.push(searchClause);
  }
  return conditions.length ? and(...conditions) : undefined;
}

export async function listCustomers(params: ListParams) {
  const where = buildWhere(params);

  const items = await db
    .select()
    .from(customers)
    .where(where)
    .orderBy(desc(customers.createdAt))
    .limit(params.pageSize)
    .offset((params.page - 1) * params.pageSize);

  const totalRows = await db.select({ id: customers.id }).from(customers).where(where);

  return { items, meta: paginationMeta(totalRows.length, params.page, params.pageSize) };
}

export async function getCustomerById(id: string) {
  const [customer] = await db.select().from(customers).where(eq(customers.id, id)).limit(1);
  if (!customer) throw AppError.notFound("Customer");

  const customerFollowUps = await db
    .select({
      id: followUps.id,
      note: followUps.note,
      createdAt: followUps.createdAt,
      createdByName: users.name,
    })
    .from(followUps)
    .innerJoin(users, eq(followUps.createdById, users.id))
    .where(eq(followUps.customerId, id))
    .orderBy(desc(followUps.createdAt));

  const recentChallans = await db
    .select()
    .from(salesChallans)
    .where(eq(salesChallans.customerId, id))
    .orderBy(desc(salesChallans.createdAt))
    .limit(10);

  return { ...customer, followUps: customerFollowUps, challans: recentChallans };
}

export interface CreateCustomerInput {
  name: string;
  mobile: string;
  email?: string;
  businessName?: string;
  gstNumber?: string;
  customerType: "RETAIL" | "WHOLESALE" | "DISTRIBUTOR";
  address?: string;
  status?: "LEAD" | "ACTIVE" | "INACTIVE";
  followUpDate?: Date;
  notes?: string;
}

export async function createCustomer(data: CreateCustomerInput) {
  const [customer] = await db.insert(customers).values(data).returning();
  return customer;
}

export async function updateCustomer(id: string, data: Partial<CreateCustomerInput>) {
  const [existing] = await db.select({ id: customers.id }).from(customers).where(eq(customers.id, id)).limit(1);
  if (!existing) throw AppError.notFound("Customer");

  const [customer] = await db
    .update(customers)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(customers.id, id))
    .returning();
  return customer;
}

export async function addFollowUp(customerId: string, note: string, createdById: string) {
  const [existing] = await db.select({ id: customers.id }).from(customers).where(eq(customers.id, customerId)).limit(1);
  if (!existing) throw AppError.notFound("Customer");

  const [followUp] = await db.insert(followUps).values({ customerId, note, createdById }).returning();
  return followUp;
}
