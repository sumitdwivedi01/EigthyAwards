import { describe, expect, it } from "vitest";
import {
  primaryRole,
  requireDeptHead,
  requireJuryOfCycle,
  requireLeader,
  requireOrgMember,
  requireSignedIn,
  requireStaffOfAward,
  type Actor,
  type ScopedRole,
} from "./access.js";
import { ForbiddenError, NotFoundError, UnauthenticatedError } from "./errors.js";

function actor(roles: Partial<ScopedRole>[] = [], organisationIds: string[] = []): Actor {
  return {
    userId: "u1",
    email: "person@example.test",
    name: "Person",
    roles: roles.map((r) => ({ role: "JURY", departmentId: null, awardId: null, cycleId: null, ...r })),
    organisationIds,
  };
}

describe("access checks: every role only inside its own scope (spec §3)", () => {
  it("asks for a login when nobody is signed in", () => {
    expect(() => requireSignedIn(null)).toThrow(UnauthenticatedError);
    expect(requireSignedIn(actor()).userId).toBe("u1");
  });

  it("refuses a jury member on staff work, even for the award they judge", () => {
    const jury = actor([{ role: "JURY", cycleId: "cycle-1" }]);
    expect(() => requireStaffOfAward(jury, "award-1")).toThrow(ForbiddenError);
    expect(() => requireJuryOfCycle(jury, "cycle-1")).not.toThrow();
  });

  it("keeps a scoped role to its own scope", () => {
    const staff = actor([{ role: "AWARD_STAFF", awardId: "award-1" }]);
    expect(() => requireStaffOfAward(staff, "award-1")).not.toThrow();
    expect(() => requireStaffOfAward(staff, "award-2")).toThrow(ForbiddenError);
    const head = actor([{ role: "DEPT_HEAD", departmentId: "dept-1" }]);
    expect(() => requireDeptHead(head, "dept-1")).not.toThrow();
    expect(() => requireDeptHead(head, "dept-2")).toThrow(ForbiddenError);
    expect(() => requireJuryOfCycle(actor([{ role: "JURY", cycleId: "cycle-1" }]), "cycle-2")).toThrow(ForbiddenError);
  });

  it("lets only the leader do the leader's work", () => {
    expect(() => requireLeader(actor([{ role: "LEADER" }]))).not.toThrow();
    expect(() => requireLeader(actor([{ role: "DEPT_HEAD", departmentId: "dept-1" }]))).toThrow(ForbiddenError);
  });

  it("answers 'not found' for another organisation, so its existence isn't revealed", () => {
    const applicant = actor([], ["org-1"]);
    expect(() => requireOrgMember(applicant, "org-1")).not.toThrow();
    expect(() => requireOrgMember(applicant, "org-2")).toThrow(NotFoundError);
  });

  it("records the highest role for actions on one's own account, and none for an applicant", () => {
    expect(primaryRole(actor([{ role: "JURY", cycleId: "c" }, { role: "DEPT_HEAD", departmentId: "d" }]))).toBe(
      "DEPT_HEAD",
    );
    expect(primaryRole(actor())).toBeNull();
  });
});
