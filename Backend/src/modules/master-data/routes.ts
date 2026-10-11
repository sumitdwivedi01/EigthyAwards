import { Router } from "express";
import { listAwardDomains, listOrganisationTypes, listStates } from "./service.js";

/** Public, read-only lists. Nothing to parse: the routes take no input. */
export function buildMasterDataRouter(): Router {
  const router = Router();

  router.get("/organisation-types", async (_req, res) => {
    res.json(await listOrganisationTypes());
  });

  router.get("/award-domains", async (_req, res) => {
    res.json(await listAwardDomains());
  });

  router.get("/states", (_req, res) => {
    res.json(listStates());
  });

  return router;
}
