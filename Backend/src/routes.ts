import { Router } from "express";
import { env } from "./config/env.js";
import { db } from "./lib/db.js";
import { buildDiskStorageRouter } from "./lib/storage/disk-routes.js";
import { buildAwardsRouter, buildCyclesRouter, buildRoundsRouter } from "./modules/awards/routes.js";
import { buildDepartmentsRouter } from "./modules/departments/routes.js";
import { buildFormsRouter } from "./modules/forms/routes.js";
import { buildIdentityRouter, type IdentityRouterOptions } from "./modules/identity/routes.js";
import { buildMasterDataRouter } from "./modules/master-data/routes.js";
import { buildOrganisationsRouter } from "./modules/organisations/routes.js";
import { buildScoringRouter } from "./modules/scoring/routes.js";
import { buildSitesRouter } from "./modules/sites/routes.js";

export type ApiOptions = IdentityRouterOptions;

/**
 * Mounts every module's router under /api. Module routers arrive step by step (PHASES.md §4):
 * identity, master data and organisations in Step 1.1; departments and award setup in 1.2; and so on.
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
  router.use("/organisations", buildOrganisationsRouter());
  router.use("/departments", buildDepartmentsRouter());
  router.use("/awards", buildAwardsRouter());
  router.use("/cycles", buildCyclesRouter());
  router.use("/cycles", buildFormsRouter());
  router.use("/rounds", buildRoundsRouter());
  router.use("/rounds", buildScoringRouter());
  // The award page's address, and the public Open awards list and award pages.
  router.use(buildSitesRouter());

  // Upload and download links of the local disk driver; Supabase Storage serves its own online.
  if (env.STORAGE_DRIVER === "disk") {
    router.use(buildDiskStorageRouter());
  }

  return router;
}
