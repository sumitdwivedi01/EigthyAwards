import { Router } from "express";
import { env } from "./config/env.js";
import { db } from "./lib/db.js";
import { buildDiskStorageRouter } from "./lib/storage/disk-routes.js";
import { buildIdentityRouter, type IdentityRouterOptions } from "./modules/identity/routes.js";
import { buildMasterDataRouter } from "./modules/master-data/routes.js";

export type ApiOptions = IdentityRouterOptions;

/**
 * Mounts every module's router under /api. Module routers arrive step by step (PHASES.md §4):
 * identity, master data and organisations in Step 1.1, award setup in 1.2, and so on.
 */
export function buildApiRouter(options: ApiOptions): Router {
  const router = Router();

  // Liveness and database check, used by Render's health check.
  router.get("/health", async (_req, res) => {
    try {
      await db.$queryRaw`SELECT 1`;
      res.json({ status: "ok", db: "up" });
    } catch {
      res.status(503).json({ status: "degraded", db: "down" });
    }
  });

  router.use(buildIdentityRouter(options));
  router.use("/master-data", buildMasterDataRouter());

  // Upload and download links of the local disk driver; Supabase Storage serves its own online.
  if (env.STORAGE_DRIVER === "disk") {
    router.use(buildDiskStorageRouter());
  }

  return router;
}
