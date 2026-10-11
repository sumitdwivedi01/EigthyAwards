import { Router } from "express";
import { requireSignedIn } from "../../lib/access.js";
import { idSchema } from "../awards/schemas.js";
import { formDraftInputSchema, publishFormSchema, versionParamsSchema } from "./schemas.js";
import { getForm, getFormVersion, publishFormVersion, saveFormDraft } from "./service.js";

/** Mounted at /cycles: the questions of one award edition. */
export function buildFormsRouter(): Router {
  const router = Router();

  router.get("/:id/form", async (req, res) => {
    const { id } = idSchema.parse(req.params);
    res.json(await getForm(requireSignedIn(req.actor), id));
  });

  router.put("/:id/form-draft", async (req, res) => {
    const { id } = idSchema.parse(req.params);
    res.json(await saveFormDraft(requireSignedIn(req.actor), id, formDraftInputSchema.parse(req.body)));
  });

  router.post("/:id/form-versions", async (req, res) => {
    const { id } = idSchema.parse(req.params);
    res.status(201).json(await publishFormVersion(requireSignedIn(req.actor), id, publishFormSchema.parse(req.body)));
  });

  router.get("/:id/form-versions/:version", async (req, res) => {
    const { id, version } = versionParamsSchema.parse(req.params);
    res.json(await getFormVersion(requireSignedIn(req.actor), id, version));
  });

  return router;
}
