import { Router } from "express";
import { requireSignedIn } from "../../lib/access.js";
import { createDepartmentSchema, departmentIdSchema, personParamsSchema, personSchema, themeSchema, type ListKind } from "./schemas.js";
import {
  addPerson,
  createDepartment,
  getTheme,
  issueTemporaryPassword,
  listDepartments,
  listPeople,
  removePerson,
  updateTheme,
} from "./service.js";

export function buildDepartmentsRouter(): Router {
  const router = Router();

  router.get("/", async (req, res) => {
    res.json(await listDepartments(requireSignedIn(req.actor)));
  });

  router.post("/", async (req, res) => {
    res.status(201).json(await createDepartment(requireSignedIn(req.actor), createDepartmentSchema.parse(req.body)));
  });

  router.get("/:id/people", async (req, res) => {
    const { id } = departmentIdSchema.parse(req.params);
    res.json(await listPeople(requireSignedIn(req.actor), id));
  });

  for (const kind of ["staff", "jury"] as const satisfies readonly ListKind[]) {
    router.post(`/:id/${kind}`, async (req, res) => {
      const { id } = departmentIdSchema.parse(req.params);
      res.status(201).json(await addPerson(requireSignedIn(req.actor), id, kind, personSchema.parse(req.body)));
    });

    router.delete(`/:id/${kind}/:userId`, async (req, res) => {
      const { id, userId } = personParamsSchema.parse(req.params);
      await removePerson(requireSignedIn(req.actor), id, kind, userId);
      res.status(204).end();
    });
  }

  router.post("/:id/people/:userId/temporary-password", async (req, res) => {
    const { id, userId } = personParamsSchema.parse(req.params);
    res.json(await issueTemporaryPassword(requireSignedIn(req.actor), id, userId));
  });

  router.get("/:id/theme", async (req, res) => {
    const { id } = departmentIdSchema.parse(req.params);
    res.json(await getTheme(requireSignedIn(req.actor), id));
  });

  router.put("/:id/theme", async (req, res) => {
    const { id } = departmentIdSchema.parse(req.params);
    res.json(await updateTheme(requireSignedIn(req.actor), id, themeSchema.parse(req.body)));
  });

  return router;
}
