export class AppError extends Error {
  public readonly statusCode: number;
  public readonly details?: unknown;

  constructor(message: string, statusCode = 400, details?: unknown) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }

  static notFound(resource: string): AppError {
    return new AppError(`${resource} not found`, 404);
  }

  static unauthorized(message = "Unauthorized"): AppError {
    return new AppError(message, 401);
  }

  static forbidden(message = "You do not have permission to perform this action"): AppError {
    return new AppError(message, 403);
  }

  static conflict(message: string): AppError {
    return new AppError(message, 409);
  }
}
