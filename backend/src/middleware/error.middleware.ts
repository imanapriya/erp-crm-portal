import { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/AppError";

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
}

interface PgError {
  code?: string;
  constraint?: string;
  detail?: string;
}

// Express recognizes this as an error handler because it has 4 parameters.
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      details: err.details,
    });
    return;
  }

  // Raw PostgreSQL error codes (via node-postgres) for constraint violations.
  // Reference: https://www.postgresql.org/docs/current/errcodes-appendix.html
  const pgErr = err as PgError;
  if (pgErr?.code === "23505") {
    res.status(409).json({
      success: false,
      message: `A record with this value already exists${pgErr.constraint ? ` (${pgErr.constraint})` : ""}`,
    });
    return;
  }
  if (pgErr?.code === "23503") {
    res.status(400).json({
      success: false,
      message: "This action references a record that does not exist",
    });
    return;
  }

  // eslint-disable-next-line no-console
  console.error("Unhandled error:", err);
  res.status(500).json({
    success: false,
    message: "Internal server error",
  });
}
