import { Router } from "express";
import { requireSignedIn } from "../../lib/access.js";
import {
  confirmEvidenceUpload,
  fileDownloadLink,
  removeEvidenceFile,
  setEmploymentProof,
  startEmploymentProofUpload,
  startEvidenceUpload,
} from "./files.js";
import {
  changeCategorySchema,
  fileParamsSchema,
  idSchema,
  listFiltersSchema,
  proofCheckSchema,
  releaseSchema,
  saveAnswersSchema,
  setProofSchema,
  startApplicationSchema,
  startEvidenceUploadSchema,
  startProofUploadSchema,
} from "./schemas.js";
import {
  applyInfo,
  changeCategory,
  getMyApplication,
  listMyApplications,
  payFee,
  saveAnswers,
  startApplication,
  submitApplication,
} from "./service.js";
import { applicationHistory } from "./history.js";
import { checkProof, listCycleApplications, releaseApplication, reviewApplication } from "./staff.js";

/** Mounted at /cycles: starting an application, and the staff's list of an edition's applications. */
export function buildCycleApplicationsRouter(): Router {
  const router = Router();

  router.get("/:id/apply", async (req, res) => {
    const { id } = idSchema.parse(req.params);
    res.json(await applyInfo(requireSignedIn(req.actor), id));
  });

  router.post("/:id/applications", async (req, res) => {
    const { id } = idSchema.parse(req.params);
    res.status(201).json(await startApplication(requireSignedIn(req.actor), id, startApplicationSchema.parse(req.body)));
  });

  router.get("/:id/applications", async (req, res) => {
    const { id } = idSchema.parse(req.params);
    res.json(await listCycleApplications(requireSignedIn(req.actor), id, listFiltersSchema.parse(req.query)));
  });

  return router;
}

/** Mounted at /applications. */
export function buildApplicationsRouter(): Router {
  const router = Router();

  router.get("/mine", async (req, res) => {
    res.json(await listMyApplications(requireSignedIn(req.actor)));
  });

  router.get("/:id", async (req, res) => {
    const { id } = idSchema.parse(req.params);
    res.json(await getMyApplication(requireSignedIn(req.actor), id));
  });

  router.patch("/:id", async (req, res) => {
    const { id } = idSchema.parse(req.params);
    res.json(await changeCategory(requireSignedIn(req.actor), id, changeCategorySchema.parse(req.body)));
  });

  router.post("/:id/payment", async (req, res) => {
    const { id } = idSchema.parse(req.params);
    res.json(await payFee(requireSignedIn(req.actor), id));
  });

  router.put("/:id/answers", async (req, res) => {
    const { id } = idSchema.parse(req.params);
    res.json(await saveAnswers(requireSignedIn(req.actor), id, saveAnswersSchema.parse(req.body)));
  });

  router.post("/:id/files", async (req, res) => {
    const { id } = idSchema.parse(req.params);
    res.status(201).json(await startEvidenceUpload(requireSignedIn(req.actor), id, startEvidenceUploadSchema.parse(req.body)));
  });

  router.put("/:id/files/:fileId", async (req, res) => {
    const { id, fileId } = fileParamsSchema.parse(req.params);
    res.json(await confirmEvidenceUpload(requireSignedIn(req.actor), id, fileId));
  });

  router.delete("/:id/files/:fileId", async (req, res) => {
    const { id, fileId } = fileParamsSchema.parse(req.params);
    res.json(await removeEvidenceFile(requireSignedIn(req.actor), id, fileId));
  });

  router.post("/:id/employment-proof/uploads", async (req, res) => {
    const { id } = idSchema.parse(req.params);
    res.status(201).json(await startEmploymentProofUpload(requireSignedIn(req.actor), id, startProofUploadSchema.parse(req.body)));
  });

  router.put("/:id/employment-proof", async (req, res) => {
    const { id } = idSchema.parse(req.params);
    const { fileId } = setProofSchema.parse(req.body);
    res.json(await setEmploymentProof(requireSignedIn(req.actor), id, fileId));
  });

  router.post("/:id/submit", async (req, res) => {
    const { id } = idSchema.parse(req.params);
    res.json(await submitApplication(requireSignedIn(req.actor), id));
  });

  router.get("/:id/review", async (req, res) => {
    const { id } = idSchema.parse(req.params);
    res.json(await reviewApplication(requireSignedIn(req.actor), id));
  });

  router.get("/:id/history", async (req, res) => {
    const { id } = idSchema.parse(req.params);
    res.json(await applicationHistory(requireSignedIn(req.actor), id));
  });

  router.post("/:id/proof-check", async (req, res) => {
    const { id } = idSchema.parse(req.params);
    res.json(await checkProof(requireSignedIn(req.actor), id, proofCheckSchema.parse(req.body)));
  });

  router.post("/:id/release", async (req, res) => {
    const { id } = idSchema.parse(req.params);
    res.json(await releaseApplication(requireSignedIn(req.actor), id, releaseSchema.parse(req.body)));
  });

  return router;
}

/** Mounted at /files: a short-lived link to read one file, after the access check. */
export function buildFilesRouter(): Router {
  const router = Router();

  router.get("/:id", async (req, res) => {
    const { id } = idSchema.parse(req.params);
    res.json(await fileDownloadLink(requireSignedIn(req.actor), id));
  });

  return router;
}
