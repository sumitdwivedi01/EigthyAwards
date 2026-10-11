import { Router } from "express";
import { requireSignedIn } from "../../lib/access.js";
import {
  createOrganisationSchema,
  joinOrganisationSchema,
  organisationIdSchema,
  updateOrganisationSchema,
} from "./schemas.js";
import {
  createOrganisation,
  getOrganisation,
  joinOrganisation,
  listMyOrganisations,
  updateOrganisation,
} from "./service.js";

export function buildOrganisationsRouter(): Router {
  const router = Router();

  router.post("/", async (req, res) => {
    res.status(201).json(await createOrganisation(requireSignedIn(req.actor), createOrganisationSchema.parse(req.body)));
  });

  router.post("/join", async (req, res) => {
    res.json(await joinOrganisation(requireSignedIn(req.actor), joinOrganisationSchema.parse(req.body)));
  });

  router.get("/mine", async (req, res) => {
    res.json(await listMyOrganisations(requireSignedIn(req.actor)));
  });

  router.get("/:id", async (req, res) => {
    const { id } = organisationIdSchema.parse(req.params);
    res.json(await getOrganisation(requireSignedIn(req.actor), id));
  });

  router.patch("/:id", async (req, res) => {
    const { id } = organisationIdSchema.parse(req.params);
    res.json(await updateOrganisation(requireSignedIn(req.actor), id, updateOrganisationSchema.parse(req.body)));
  });

  return router;
}
