import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { useTestDatabase } from "./helpers/database.js";

useTestDatabase();

describe("GET /api/health", () => {
  it("reports the API and database as up", async () => {
    const res = await request(createApp()).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok", db: "up" });
  });

  it("sends a request id back, and security headers", async () => {
    const res = await request(createApp()).get("/api/health");
    expect(res.headers["x-request-id"]).toMatch(/^[A-Za-z0-9-]{8,64}$/);
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
    expect(res.headers["x-powered-by"]).toBeUndefined();
  });
});
