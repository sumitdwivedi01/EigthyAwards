import { Router } from "express";
import { db } from "./lib/db.js";

/**
 * Mounts every module's router under /api. Module routers arrive phase by phase
 * (identity, departments and organisations in Phase 2, and so on).
 */
export function buildApiRouter(): Router {
  const router = Router();

  // Liveness and database check, used by Render's health check and the Phase 4 skeleton deploy.
  router.get("/health", async (_req, res) => {
    try {
      await db.$queryRaw`SELECT 1`;
      res.json({ status: "ok", db: "up" });
    } catch {
      res.status(503).json({ status: "degraded", db: "down" });
    }
  });

  return router;
}
