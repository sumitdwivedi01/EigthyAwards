import { Router } from "express";
import { requireSignedIn } from "../../lib/access.js";
import { idSchema } from "../awards/schemas.js";
import { scoringSheetInputSchema } from "./schemas.js";
import { getScoringSheet, saveScoringSheet } from "./service.js";

/** Mounted at /rounds: a round's scoring sheet. */
export function buildScoringRouter(): Router {
  const router = Router();

  router.get("/:id/scoring-sheet", async (req, res) => {
    const { id } = idSchema.parse(req.params);
    res.json(await getScoringSheet(requireSignedIn(req.actor), id));
  });

  router.put("/:id/scoring-sheet", async (req, res) => {
    const { id } = idSchema.parse(req.params);
    res.json(await saveScoringSheet(requireSignedIn(req.actor), id, scoringSheetInputSchema.parse(req.body)));
  });

  return router;
}
