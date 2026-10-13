import { Router } from "express";
import { requireSignedIn } from "../../lib/access.js";
import { dashboard } from "./service.js";

/** Mounted at /reports: the leadership dashboard (the leader; a head for their departments). */
export function buildReportingRouter(): Router {
  const router = Router();

  router.get("/dashboard", async (req, res) => {
    res.json(await dashboard(requireSignedIn(req.actor)));
  });

  return router;
}
