import express from "express";
import request from "supertest";
import { z } from "zod";
import { describe, expect, it } from "vitest";
import {
  ForbiddenError,
  NotFoundError,
  StateError,
  UnauthenticatedError,
  ValidationError,
} from "../lib/errors.js";
import { errorHandler, notFoundHandler } from "./error-handler.js";

// Spec §11: typed errors map to 400, 401, 403, 404 and 409; anything else is a bare 500.
function appThrowing(error: unknown) {
  const app = express();
  app.use(express.json());
  app.get("/boom", () => {
    throw error;
  });
  app.post("/echo", (req, res) => {
    res.json(req.body);
  });
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

describe("error handler", () => {
  it.each([
    [new ValidationError("Some fields are invalid."), 400, "VALIDATION_ERROR"],
    [new UnauthenticatedError(), 401, "UNAUTHENTICATED"],
    [new ForbiddenError(), 403, "FORBIDDEN"],
    [new NotFoundError(), 404, "NOT_FOUND"],
    [new StateError("The deadline has passed."), 409, "STATE_CONFLICT"],
  ])("maps %s to its status and JSON shape", async (error, status, code) => {
    const res = await request(appThrowing(error)).get("/boom");
    expect(res.status).toBe(status);
    expect(res.body.error.code).toBe(code);
    expect(res.body.error.message).toBe(error.message);
  });

  it("includes validation details", async () => {
    const error = new ValidationError("x", [{ path: "pan", message: "bad" }]);
    const res = await request(appThrowing(error)).get("/boom");
    expect(res.body.error.details).toEqual([{ path: "pan", message: "bad" }]);
  });

  it("turns a Zod error into a 400 listing the fields", async () => {
    const parsed = z.object({ pan: z.string() }).safeParse({ pan: 1 });
    const res = await request(appThrowing(parsed.error)).get("/boom");
    expect(res.status).toBe(400);
    expect(res.body.error.details[0].path).toBe("pan");
  });

  it("hides unknown errors behind a generic 500", async () => {
    const res = await request(appThrowing(new Error("database password is hunter2"))).get("/boom");
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: { code: "INTERNAL", message: "Something went wrong." } });
  });

  it("answers malformed JSON with a 400", async () => {
    const res = await request(appThrowing(null))
      .post("/echo")
      .set("content-type", "application/json")
      .send("{bad");
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("MALFORMED_JSON");
  });

  it("answers unknown routes with a 404 in the same shape", async () => {
    const res = await request(appThrowing(null)).get("/nowhere");
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });
});
