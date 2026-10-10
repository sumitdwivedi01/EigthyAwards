import type { ErrorRequestHandler, RequestHandler } from "express";
import { ZodError } from "zod";
import { AppError, ValidationError } from "../lib/errors.js";
import { logger } from "../lib/logger.js";

/** The JSON shape of every error response. */
export interface ErrorBody {
  error: { code: string; message: string; details?: unknown };
}

function hasType(error: unknown, type: string): boolean {
  return typeof error === "object" && error !== null && "type" in error && error.type === type;
}

/**
 * Maps typed errors to HTTP responses (spec §11): ValidationError 400, UnauthenticatedError 401,
 * ForbiddenError 403, NotFoundError 404, StateError 409. Anything else is a 500 with no details,
 * so internal messages never leak to the browser.
 */
export const errorHandler: ErrorRequestHandler = (error: unknown, req, res, _next) => {
  const known =
    error instanceof ZodError ? ValidationError.fromZod(error) : error instanceof AppError ? error : null;

  if (known) {
    const body: ErrorBody = { error: { code: known.code, message: known.message } };
    if (known.details !== undefined) {
      body.error.details = known.details;
    }
    res.status(known.status).json(body);
    return;
  }

  // Errors from express.json(): malformed or oversized bodies.
  if (hasType(error, "entity.parse.failed")) {
    res.status(400).json({ error: { code: "MALFORMED_JSON", message: "The request body is not valid JSON." } });
    return;
  }
  if (hasType(error, "entity.too.large")) {
    res.status(413).json({ error: { code: "PAYLOAD_TOO_LARGE", message: "The request body is too large." } });
    return;
  }

  (req.log ?? logger).error({ err: error }, "unhandled error");
  res.status(500).json({ error: { code: "INTERNAL", message: "Something went wrong." } });
};

export const notFoundHandler: RequestHandler = (_req, res) => {
  res.status(404).json({ error: { code: "NOT_FOUND", message: "Not found." } });
};
