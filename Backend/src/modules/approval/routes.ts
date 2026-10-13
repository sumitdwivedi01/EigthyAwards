import { Router } from "express";
import { requireSignedIn } from "../../lib/access.js";
import { idSchema } from "../judging/schemas.js";
import { approveSchema } from "./schemas.js";
import { approvalQueue, approveRound, sendForApproval } from "./service.js";

/** Mounted at /rounds: staff send a round, the department's head approves it. */
export function buildApprovalRoundsRouter(): Router {
  const router = Router();

  router.post("/:id/send-for-approval", async (req, res) => {
    const { id } = idSchema.parse(req.params);
    res.json(await sendForApproval(requireSignedIn(req.actor), id));
  });

  router.post("/:id/approve", async (req, res) => {
    const { id } = idSchema.parse(req.params);
    res.json(await approveRound(requireSignedIn(req.actor), id, approveSchema.parse(req.body ?? {})));
  });

  return router;
}

/** Mounted at /approvals: the head's queue. */
export function buildApprovalsRouter(): Router {
  const router = Router();

  router.get("/", async (req, res) => {
    res.json(await approvalQueue(requireSignedIn(req.actor)));
  });

  return router;
}
