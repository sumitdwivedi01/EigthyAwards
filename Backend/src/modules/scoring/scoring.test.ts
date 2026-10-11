import { describe, expect, it } from "vitest";
import { createApp } from "../../app.js";
import { db } from "../../lib/db.js";
import { createAwardWithCycle, SAMPLE_FORM, staffWithDepartment } from "../../../tests/helpers/award-setup.js";
import { useTestDatabase } from "../../../tests/helpers/database.js";
import { sheetIssues } from "./service.js";

useTestDatabase();

const section = (title: string, weight: number, indicators: { weight: number; questionKey?: string }[]) => ({
  key: `area_${title}`,
  title,
  weight,
  indicators: indicators.map((i, n) => ({
    key: `ind_${title}${n}`,
    label: `${title} ${n}`,
    type: "SCORE" as const,
    weight: i.weight,
    questionKey: i.questionKey ?? "q_published0",
  })),
});

describe("the scoring sheet's checks (spec §5.5, ADR 0019)", () => {
  const published = new Set(["q_published0"]);

  it("passes a sheet whose totals are 100 at each level and whose indicators score published questions", () => {
    expect(sheetIssues([section("a", 40, [{ weight: 60 }, { weight: 40 }]), section("b", 60, [{ weight: 100 }])], published)).toEqual([]);
  });

  it("names every total that isn't 100", () => {
    expect(sheetIssues([section("a", 40, [{ weight: 50 }, { weight: 40 }]), section("b", 50, [{ weight: 100 }])], published)).toEqual([
      "The section weights add up to 90%, not 100%.",
      'In "a", the indicator weights add up to 90%, not 100%.',
    ]);
  });

  it("refuses an empty sheet, a section without indicators, and an indicator on an unpublished question", () => {
    expect(sheetIssues([], published)).toEqual(["The scoring sheet needs at least one section with an indicator."]);
    expect(sheetIssues([section("a", 100, [])], published)).toEqual(['The section "a" has no indicators.']);
    expect(sheetIssues([section("a", 100, [{ weight: 100, questionKey: "q_draftonly0" }])], published)).toEqual([
      '"a 0" scores a question that isn\'t in the published questions.',
    ]);
  });
});

describe("saving the scoring sheet", () => {
  async function setup() {
    const app = createApp();
    const { staff, department, domain } = await staffWithDepartment(app);
    const { cycleId, roundId } = await createAwardWithCycle(staff, department.id, domain.id);
    const form = await staff.put(`/api/cycles/${cycleId}/form-draft`).send(SAMPLE_FORM);
    const questionKey: string = form.body.draft.sections[0].questions[0].key;
    return { staff, cycleId, roundId, questionKey };
  }

  it("keys every section and indicator, and shows running totals and what still blocks it", async () => {
    const { staff, roundId, questionKey } = await setup();
    const res = await staff.put(`/api/rounds/${roundId}/scoring-sheet`).send({
      sections: [{ title: "Training", weight: 80, indicators: [{ label: "Quality", type: "SCORE", weight: 70, questionKey }] }],
    });
    expect(res.status).toBe(200);
    expect(res.body.sections[0]).toMatchObject({ key: expect.stringMatching(/^area_/), indicators: [{ key: expect.stringMatching(/^ind_/) }] });
    expect(res.body.totals).toEqual({ sections: 80, bySection: { [res.body.sections[0].key]: 70 } });
    expect(res.body.issues).toEqual([
      "The section weights add up to 80%, not 100%.",
      'In "Training", the indicator weights add up to 70%, not 100%.',
      '"Quality" scores a question that isn\'t in the published questions.',
    ]);
    expect(res.body.questions[0]).toMatchObject({ key: questionKey, published: false });
  });

  it("refuses weights that aren't whole percentages from 1 to 100, and a question that isn't in the form", async () => {
    const { staff, roundId, questionKey } = await setup();
    const send = (weight: number, key = questionKey) =>
      staff.put(`/api/rounds/${roundId}/scoring-sheet`).send({
        sections: [{ title: "T", weight: 100, indicators: [{ label: "I", type: "SCORE", weight, questionKey: key }] }],
      });
    expect((await send(0)).status).toBe(400);
    expect((await send(12.5)).status).toBe(400);
    expect((await send(101)).status).toBe(400);
    const stranger = await send(100, "q_notinform");
    expect(stranger.status).toBe(400);
    expect(stranger.body.error.details).toEqual([expect.objectContaining({ path: "sections.0.indicators.0.questionKey" })]);
  });

  it("is locked once scoring has started", async () => {
    const { staff, roundId, questionKey } = await setup();
    await db.scoringSheet.update({ where: { roundId }, data: { lockedAt: new Date() } });
    const res = await staff.put(`/api/rounds/${roundId}/scoring-sheet`).send({
      sections: [{ title: "T", weight: 100, indicators: [{ label: "I", type: "SCORE", weight: 100, questionKey }] }],
    });
    expect(res.status).toBe(409);
  });
});
