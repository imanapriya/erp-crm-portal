import bcrypt from "bcryptjs";
import jwt, { SignOptions } from "jsonwebtoken";
import { eq } from "drizzle-orm";
import { db } from "../../lib/db";
import { users } from "../../db/schema";
import { env } from "../../config/env";
import { AppError } from "../../utils/AppError";
import { AuthPayload, UserRole } from "../../middleware/auth.middleware";

function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  } as SignOptions);
}

export async function login(email: string, password: string) {
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!user) {
    throw AppError.unauthorized("Invalid email or password");
  }

  const passwordMatches = await bcrypt.compare(password, user.password);
  if (!passwordMatches) {
    throw AppError.unauthorized("Invalid email or password");
  }

  const payload: AuthPayload = {
    id: user.id,
    email: user.email,
    role: user.role as UserRole,
    name: user.name,
  };

  return {
    token: signToken(payload),
    user: payload,
  };
}

export async function register(name: string, email: string, password: string, role: UserRole) {
  const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (existing) {
    throw AppError.conflict("A user with this email already exists");
  }

  const hashed = await bcrypt.hash(password, 10);
  const [user] = await db.insert(users).values({ name, email, password: hashed, role }).returning();

  const payload: AuthPayload = {
    id: user.id,
    email: user.email,
    role: user.role as UserRole,
    name: user.name,
  };

  return {
    token: signToken(payload),
    user: payload,
  };
}

export async function me(userId: string) {
  const [user] = await db
    .select({ id: users.id, name: users.name, email: users.email, role: users.role, createdAt: users.createdAt })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!user) throw AppError.notFound("User");
  return user;
}
