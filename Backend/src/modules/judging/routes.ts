import { Router } from "express";
import { requireSignedIn } from "../../lib/access.js";
import { assignApplications, getAssignmentBoard, revokeAssignment } from "./assignment.js";
import { recordConflict, removeConflict } from "./conflicts.js";
import { juryEvaluationView, juryHome, saveScores, submitEvaluation } from "./evaluations.js";
import { correctScores, getJudging } from "./progress.js";
import {
  assignSchema,
  conflictParamsSchema,
  idSchema,
  recordConflictSchema,
  removeConflictSchema,
  revokeSchema,
  saveScoresSchema,
  scoreChangeSchema,
} from "./schemas.js";

/** Mounted at /rounds: the assignment board, assigning, and the judging progress. */
export function buildRoundJudgingRouter(): Router {
  const router = Router();

  router.get("/:id/assignment-board", async (req, res) => {
    const { id } = idSchema.parse(req.params);
    res.json(await getAssignmentBoard(requireSignedIn(req.actor), id));
  });

  router.post("/:id/assignments", async (req, res) => {
    const { id } = idSchema.parse(req.params);
    res.status(201).json(await assignApplications(requireSignedIn(req.actor), id, assignSchema.parse(req.body)));
  });

  router.get("/:id/judging", async (req, res) => {
    const { id } = idSchema.parse(req.params);
    res.json(await getJudging(requireSignedIn(req.actor), id));
  });

  return router;
}

/** Mounted at /cycles: conflicts are recorded in an edition's context and apply to every award. */
export function buildConflictsRouter(): Router {
  const router = Router();

  router.post("/:id/conflicts", async (req, res) => {
    const { id } = idSchema.parse(req.params);
    res.status(201).json(await recordConflict(requireSignedIn(req.actor), id, recordConflictSchema.parse(req.body)));
  });

  router.post("/:id/conflicts/:conflictId/remove", async (req, res) => {
    const { id, conflictId } = conflictParamsSchema.parse(req.params);
    await removeConflict(requireSignedIn(req.actor), id, conflictId, removeConflictSchema.parse(req.body));
    res.status(204).end();
  });

  return router;
}

/** Mounted at /evaluations: the jury's scoring, and staff taking back or correcting. */
export function buildEvaluationsRouter(): Router {
  const router = Router();

  router.get("/:id", async (req, res) => {
    const { id } = idSchema.parse(req.params);
    res.json(await juryEvaluationView(requireSignedIn(req.actor), id));
  });

  router.put("/:id/scores", async (req, res) => {
    const { id } = idSchema.parse(req.params);
    res.json(await saveScores(requireSignedIn(req.actor), id, saveScoresSchema.parse(req.body)));
  });

  router.post("/:id/submit", async (req, res) => {
    const { id } = idSchema.parse(req.params);
    res.json(await submitEvaluation(requireSignedIn(req.actor), id));
  });

  router.post("/:id/revoke", async (req, res) => {
    const { id } = idSchema.parse(req.params);
    res.json(await revokeAssignment(requireSignedIn(req.actor), id, revokeSchema.parse(req.body)));
  });

  router.post("/:id/score-changes", async (req, res) => {
    const { id } = idSchema.parse(req.params);
    res.json(await correctScores(requireSignedIn(req.actor), id, scoreChangeSchema.parse(req.body)));
  });

  return router;
}

/** Mounted at /jury: the jury member's own assignments. */
export function buildJuryRouter(): Router {
  const router = Router();

  router.get("/evaluations", async (req, res) => {
    res.json(await juryHome(requireSignedIn(req.actor)));
  });

  return router;
}
