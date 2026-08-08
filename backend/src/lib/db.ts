import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { env } from "../config/env";
import * as schema from "../db/schema";

// A single shared pg Pool is reused across the app so we don't exhaust
// PostgreSQL connections by opening one per request.
export const pool = new Pool({ connectionString: env.databaseUrl });

export const db = drizzle(pool, { schema });
export type Db = typeof db;
