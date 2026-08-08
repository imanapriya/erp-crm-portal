import { NextFunction, Request, Response } from "express";
import { AnyZodObject, ZodError } from "zod";
import { AppError } from "../utils/AppError";

interface ValidationSchemas {
  body?: AnyZodObject;
  query?: AnyZodObject;
  params?: AnyZodObject;
}

/** Validates req.body/query/params against Zod schemas and replaces them with the parsed (typed, coerced) result. */
export function validate(schemas: ValidationSchemas) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      if (schemas.body) req.body = schemas.body.parse(req.body);
      if (schemas.query) req.query = schemas.query.parse(req.query) as unknown as typeof req.query;
      if (schemas.params) req.params = schemas.params.parse(req.params) as unknown as typeof req.params;
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        throw new AppError(
          "Validation failed",
          422,
          err.errors.map((e) => ({ field: e.path.join("."), message: e.message }))
        );
      }
      throw err;
    }
  };
}
