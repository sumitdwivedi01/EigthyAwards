import { Router } from "express";
import { requireSignedIn } from "../../lib/access.js";
import {
  categoryParamsSchema,
  categorySchema,
  createAwardSchema,
  createCycleSchema,
  idSchema,
  updateCategorySchema,
  updateCycleSchema,
  updateRoundSchema,
} from "./schemas.js";
import {
  addCategory,
  createAward,
  createCycle,
  getAward,
  getCycleSetup,
  listMyAwards,
  publishCycle,
  removeCategory,
  updateCategory,
  updateCycle,
  updateRound,
} from "./service.js";

/** Mounted at /awards. */
export function buildAwardsRouter(): Router {
  const router = Router();

  router.get("/mine", async (req, res) => {
    res.json(await listMyAwards(requireSignedIn(req.actor)));
  });

  router.post("/", async (req, res) => {
    res.status(201).json(await createAward(requireSignedIn(req.actor), createAwardSchema.parse(req.body)));
  });

  router.get("/:id", async (req, res) => {
    const { id } = idSchema.parse(req.params);
    res.json(await getAward(requireSignedIn(req.actor), id));
  });

  router.post("/:id/cycles", async (req, res) => {
    const { id } = idSchema.parse(req.params);
    res.status(201).json(await createCycle(requireSignedIn(req.actor), id, createCycleSchema.parse(req.body)));
  });

  return router;
}

/** Mounted at /cycles: one edition's settings, categories and publishing. */
export function buildCyclesRouter(): Router {
  const router = Router();

  router.get("/:id", async (req, res) => {
    const { id } = idSchema.parse(req.params);
    res.json(await getCycleSetup(requireSignedIn(req.actor), id));
  });

  router.patch("/:id", async (req, res) => {
    const { id } = idSchema.parse(req.params);
    res.json(await updateCycle(requireSignedIn(req.actor), id, updateCycleSchema.parse(req.body)));
  });

  router.post("/:id/categories", async (req, res) => {
    const { id } = idSchema.parse(req.params);
    res.status(201).json(await addCategory(requireSignedIn(req.actor), id, categorySchema.parse(req.body)));
  });

  router.patch("/:id/categories/:categoryId", async (req, res) => {
    const { id, categoryId } = categoryParamsSchema.parse(req.params);
    res.json(await updateCategory(requireSignedIn(req.actor), id, categoryId, updateCategorySchema.parse(req.body)));
  });

  router.delete("/:id/categories/:categoryId", async (req, res) => {
    const { id, categoryId } = categoryParamsSchema.parse(req.params);
    res.json(await removeCategory(requireSignedIn(req.actor), id, categoryId));
  });

  router.post("/:id/publish", async (req, res) => {
    const { id } = idSchema.parse(req.params);
    res.json(await publishCycle(requireSignedIn(req.actor), id));
  });

  return router;
}

/** Mounted at /rounds: a round's jury per application and result names. */
export function buildRoundsRouter(): Router {
  const router = Router();

  router.patch("/:id", async (req, res) => {
    const { id } = idSchema.parse(req.params);
    res.json(await updateRound(requireSignedIn(req.actor), id, updateRoundSchema.parse(req.body)));
  });

  return router;
}
