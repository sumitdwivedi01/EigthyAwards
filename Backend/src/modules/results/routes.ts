import { Router } from "express";
import { requireSignedIn } from "../../lib/access.js";
import { idSchema } from "../judging/schemas.js";
import { decideResultsSchema } from "./schemas.js";
import { decideResults, publishResults } from "./service.js";

/** Mounted at /rounds: a round's results, after approval. */
export function buildResultsRouter(): Router {
  const router = Router();

  router.put("/:id/results", async (req, res) => {
    const { id } = idSchema.parse(req.params);
    res.json(await decideResults(requireSignedIn(req.actor), id, decideResultsSchema.parse(req.body)));
  });

  router.post("/:id/publish-results", async (req, res) => {
    const { id } = idSchema.parse(req.params);
    res.json(await publishResults(requireSignedIn(req.actor), id));
  });

  return router;
}
