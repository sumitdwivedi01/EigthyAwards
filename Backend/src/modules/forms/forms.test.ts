import type request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../../app.js";
import { db } from "../../lib/db.js";
import { createAwardWithCycle, DAY, SAMPLE_FORM, staffWithDepartment } from "../../../tests/helpers/award-setup.js";
import { useTestDatabase } from "../../../tests/helpers/database.js";

useTestDatabase();

async function setup() {
  const app = createApp();
  const { staff, department, domain } = await staffWithDepartment(app);
  const { cycleId } = await createAwardWithCycle(staff, department.id, domain.id);
  return { staff, cycleId };
}

interface SavedForm {
  sections: { key: string; title: string; questions: { key: string; type: string; label: string; options?: { key: string; label: string }[] }[] }[];
}

async function saveDraft(staff: request.Agent, cycleId: string, form: object) {
  return staff.put(`/api/cycles/${cycleId}/form-draft`).send(form);
}

async function publish(staff: request.Agent, cycleId: string, changeSummary = "First version") {
  return staff.post(`/api/cycles/${cycleId}/form-versions`).send({ changeSummary });
}

describe("the question builder (spec §5.4)", () => {
  it("gives every new section, question and choice a key made by the server, and keeps it", async () => {
    const { staff, cycleId } = await setup();
    const res = await saveDraft(staff, cycleId, SAMPLE_FORM);
    expect(res.status).toBe(200);
    const form: SavedForm = res.body.draft;
    expect(form.sections.map((s) => s.key)).toEqual([expect.stringMatching(/^sec_[0-9a-z]{10}$/), expect.stringMatching(/^sec_/)]);
    const choice = form.sections[1]?.questions[0];
    expect(choice).toMatchObject({ key: expect.stringMatching(/^q_/), type: "SINGLE_CHOICE" });
    expect(choice?.options?.map((o) => o.key)).toEqual([expect.stringMatching(/^opt_/), expect.stringMatching(/^opt_/)]);

    const again = await saveDraft(staff, cycleId, form);
    expect(again.body.draft).toEqual(res.body.draft);
    expect(again.body).toMatchObject({ latestVersion: null, hasUnpublishedChanges: true });
  });

  it("stores only the fields a question's type uses, with defaults", async () => {
    const { staff, cycleId } = await setup();
    const res = await saveDraft(staff, cycleId, {
      sections: [
        {
          title: "Facts",
          questions: [
            { type: "SHORT_TEXT", label: "Plant name", options: [{ label: "ignored" }] },
            { type: "NUMBER", label: "Workers", min: 0, max: 100000 },
            { type: "FILE_UPLOAD", label: "Certificate", maxFiles: 2, fileTypes: ["pdf", "pdf"] },
          ],
        },
      ],
    });
    expect(res.status).toBe(200);
    const [text, number, file] = (res.body.draft as SavedForm).sections[0]?.questions ?? [];
    expect(text).toEqual({ key: expect.any(String), type: "SHORT_TEXT", label: "Plant name", help: "", required: true, maxLength: 300 });
    expect(number).toMatchObject({ type: "NUMBER", min: 0, max: 100000 });
    expect(file).toMatchObject({ type: "FILE_UPLOAD", maxFiles: 2, fileTypes: ["pdf"] });
  });

  it("refuses a choice question with fewer than two choices, a number range upside down, and keys it didn't make", async () => {
    const { staff, cycleId } = await setup();
    const oneChoice = await saveDraft(staff, cycleId, {
      sections: [{ title: "S", questions: [{ type: "SINGLE_CHOICE", label: "Pick", options: [{ label: "Only" }] }] }],
    });
    expect(oneChoice.status).toBe(400);
    expect(oneChoice.body.error.details).toEqual([expect.objectContaining({ path: "sections.0.questions.0.options" })]);
    const range = await saveDraft(staff, cycleId, {
      sections: [{ title: "S", questions: [{ type: "NUMBER", label: "N", min: 10, max: 1 }] }],
    });
    expect(range.status).toBe(400);
    const invented = await saveDraft(staff, cycleId, {
      sections: [{ key: "sec_aaaaaaaaaa", title: "S", questions: [{ type: "YES_NO", label: "Q" }] }],
    });
    expect(invented.status).toBe(400);
  });

  it("never makes the same key twice, even for an item removed before it was published", async () => {
    const { staff, cycleId } = await setup();
    const first = await saveDraft(staff, cycleId, { sections: [{ title: "S", questions: [{ type: "YES_NO", label: "Old" }] }] });
    const firstForm: SavedForm = first.body.draft;
    const oldKey = firstForm.sections[0]?.questions[0]?.key;
    const keys = new Set<string>([firstForm.sections[0]?.key ?? "", oldKey ?? ""]);
    for (let round = 0; round < 5; round += 1) {
      const res = await saveDraft(staff, cycleId, {
        sections: [{ key: firstForm.sections[0]?.key, title: "S", questions: [{ type: "YES_NO", label: `New ${round}` }] }],
      });
      const key = (res.body.draft as SavedForm).sections[0]?.questions[0]?.key ?? "";
      expect(keys.has(key)).toBe(false);
      keys.add(key);
    }
  });
});

describe("published versions are frozen (rule R4)", () => {
  it("publishes version 1, refuses publishing nothing new, and leaves version 1 as it was after version 2", async () => {
    const { staff, cycleId } = await setup();
    const draft = await saveDraft(staff, cycleId, SAMPLE_FORM);
    expect((await publish(staff, cycleId)).status).toBe(201);
    const v1 = await staff.get(`/api/cycles/${cycleId}/form-versions/1`);
    expect(v1.body).toMatchObject({ version: 1, changeSummary: "First version" });

    const unchanged = await publish(staff, cycleId, "Nothing");
    expect(unchanged.status).toBe(409);

    // Allowed inside the cycle: new questions, new choices, new wording, the required flag.
    const form: SavedForm = draft.body.draft;
    const [training, incidents] = form.sections;
    const edited = await saveDraft(staff, cycleId, {
      sections: [
        { ...training, title: "Training and drills", questions: [...(training?.questions ?? []), { type: "SHORT_TEXT", label: "Trainer's name" }] },
        {
          ...incidents,
          questions: [{ ...incidents?.questions[0], label: "How do workers report incidents?", required: false, options: [...(incidents?.questions[0]?.options ?? []), { label: "By phone" }] }],
        },
      ],
    });
    expect(edited.status, JSON.stringify(edited.body)).toBe(200);
    const v2 = await publish(staff, cycleId, "Added a question and a choice");
    expect(v2.status).toBe(201);
    expect(v2.body.versions.map((v: { version: number }) => v.version)).toEqual([1, 2]);

    const v1Again = await staff.get(`/api/cycles/${cycleId}/form-versions/1`);
    expect(v1Again.body).toEqual(v1.body);
    // And the database itself refuses to change a published version.
    const row = await db.formVersion.findFirstOrThrow({ where: { cycleId, version: 1 } });
    await expect(db.formVersion.update({ where: { id: row.id }, data: { changeSummary: "edited" } })).rejects.toThrow(/append-only/);
  });

  it("refuses removing a published question, changing its type, or removing a published choice", async () => {
    const { staff, cycleId } = await setup();
    const form: SavedForm = (await saveDraft(staff, cycleId, SAMPLE_FORM)).body.draft;
    await publish(staff, cycleId);
    const [training, incidents] = form.sections;

    const removed = await saveDraft(staff, cycleId, { sections: [{ ...training, questions: training?.questions.slice(0, 1) }, incidents] });
    expect(removed.status).toBe(400);
    expect(JSON.stringify(removed.body.error.details)).toMatch(/can't be removed/);

    const retyped = await saveDraft(staff, cycleId, {
      sections: [{ ...training, questions: [{ ...training?.questions[0], type: "SHORT_TEXT" }, training?.questions[1]] }, incidents],
    });
    expect(retyped.status).toBe(400);
    expect(JSON.stringify(retyped.body.error.details)).toMatch(/type can't change/);

    const choiceRemoved = await saveDraft(staff, cycleId, {
      sections: [training, { ...incidents, questions: [{ ...incidents?.questions[0], options: [...(incidents?.questions[0]?.options ?? []).slice(0, 1), { label: "New" }] }] }],
    });
    expect(choiceRemoved.status).toBe(400);
    expect(JSON.stringify(choiceRemoved.body.error.details)).toMatch(/choice .* can't be removed/);

    const sectionRemoved = await saveDraft(staff, cycleId, { sections: [training] });
    expect(sectionRemoved.status).toBe(400);
  });

  it("refuses publishing an empty form or a section without questions", async () => {
    const { staff, cycleId } = await setup();
    expect((await publish(staff, cycleId)).status).toBe(400);
    await saveDraft(staff, cycleId, { sections: [{ title: "Empty", questions: [] }] });
    const res = await publish(staff, cycleId);
    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body.error.details)).toMatch(/has no questions/);
  });

  it("fixes the questions once the deadline has passed", async () => {
    const { staff, cycleId } = await setup();
    await saveDraft(staff, cycleId, SAMPLE_FORM);
    // Moving the clock 31 days would also end the test session, so the dates move instead.
    await db.cycle.update({
      where: { id: cycleId },
      data: { opensAt: new Date(Date.now() - 30 * DAY), deadlineAt: new Date(Date.now() - DAY) },
    });
    expect((await saveDraft(staff, cycleId, SAMPLE_FORM)).status).toBe(409);
    expect((await publish(staff, cycleId)).status).toBe(409);
    expect((await staff.get(`/api/cycles/${cycleId}/form`)).body.locked).toBe(true);
  });
});
