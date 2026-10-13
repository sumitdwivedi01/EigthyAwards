import { Router } from "express";
import { z } from "zod";
import { requireSignedIn } from "../../lib/access.js";
import { awardPageSchema, idSchema } from "../awards/schemas.js";
import { getPublicAward, listOpenAwards, setAwardPageAddress } from "./service.js";

const slugParams = z.object({ slug: z.string().min(1).max(60) });

/** Award pages: the address staff choose, and the public Open awards list and award page (no login). */
export function buildSitesRouter(): Router {
  const router = Router();

  router.put("/awards/:id/site", async (req, res) => {
    const { id } = idSchema.parse(req.params);
    res.json(await setAwardPageAddress(requireSignedIn(req.actor), id, awardPageSchema.parse(req.body)));
  });

  router.get("/public/awards", async (_req, res) => {
    res.json(await listOpenAwards());
  });

  router.get("/public/awards/:slug", async (req, res) => {
    const { slug } = slugParams.parse(req.params);
    res.json(await getPublicAward(slug));
  });

  return router;
}
