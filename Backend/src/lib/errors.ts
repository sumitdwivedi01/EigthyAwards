import type { z } from "zod";

/**
 * Typed errors thrown by services. Services know nothing about HTTP; the error handler maps
 * each type to a status code (spec §11).
 */
export abstract class AppError extends Error {
  abstract readonly status: number;
  abstract readonly code: string;

  constructor(
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

/** 400: the input failed validation. */
export class ValidationError extends AppError {
  override readonly status = 400;
  override readonly code = "VALIDATION_ERROR";

  static fromZod(error: z.ZodError): ValidationError {
    const issues = error.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
    }));
    return new ValidationError("Some fields are invalid.", issues);
  }
}

/** 401: nobody is logged in. */
export class UnauthenticatedError extends AppError {
  override readonly status = 401;
  override readonly code = "UNAUTHENTICATED";

  constructor(message = "Please log in.") {
    super(message);
  }
}

/** 403: logged in, but this role or scope does not allow it. */
export class ForbiddenError extends AppError {
  override readonly status = 403;
  override readonly code = "FORBIDDEN";

  constructor(message = "You are not allowed to do this.") {
    super(message);
  }
}

/** 404: missing, or exists but is not the actor's to know about. */
export class NotFoundError extends AppError {
  override readonly status = 404;
  override readonly code = "NOT_FOUND";

  constructor(message = "Not found.") {
    super(message);
  }
}

/** 409: the request is valid but the current state forbids it (wrong status, past deadline, locked round). */
export class StateError extends AppError {
  override readonly status = 409;
  override readonly code = "STATE_CONFLICT";
}
