import { describe, expect, it } from "vitest";
import {
  primaryRole,
  requireApplicantAccount,
  requireDeptHead,
  requireJuryOfDepartment,
  requireLeader,
  requireOrgMember,
  requireSignedIn,
  requireStaffOfAward,
  type Actor,
  type ScopedRole,
} from "./access.js";
import { ForbiddenError, NotFoundError, UnauthenticatedError } from "./errors.js";

const person = { userId: "u1", email: "person@example.test", name: "Person", mustChangePassword: false };

/** A platform account (leader, head, staff, jury) holding these roles. */
function actor(roles: Partial<ScopedRole>[] = []): Actor {
  return {
    ...person,
    accountType: "PLATFORM",
    roles: roles.map((r) => ({ role: "JURY", departmentId: null, awardId: null, ...r })),
    organisationIds: [],
  };
}

/** An applicant account, a member of these organisations. */
function applicantAccount(organisationIds: string[] = []): Actor {
  return { ...person, accountType: "APPLICANT", roles: [], organisationIds };
}

describe("access checks: every role only inside its own scope (spec §3)", () => {
  it("asks for a login when nobody is signed in", () => {
    expect(() => requireSignedIn(null)).toThrow(UnauthenticatedError);
    expect(requireSignedIn(actor()).userId).toBe("u1");
  });

  it("refuses a jury member on staff work, even for the award they judge", () => {
    const jury = actor([{ role: "JURY", departmentId: "dept-1" }]);
    expect(() => requireStaffOfAward(jury, { id: "award-1", departmentId: "dept-1" })).toThrow(ForbiddenError);
    expect(() => requireJuryOfDepartment(jury, "dept-1")).not.toThrow();
  });

  it("keeps a scoped role to its own scope", () => {
    const staff = actor([{ role: "AWARD_STAFF", awardId: "award-1" }]);
    expect(() => requireStaffOfAward(staff, { id: "award-1", departmentId: "dept-9" })).not.toThrow();
    expect(() => requireStaffOfAward(staff, { id: "award-2", departmentId: "dept-9" })).toThrow(ForbiddenError);
    // ADR 0021: every staff member of the award department runs its award; another department's don't.
    const departmentStaff = actor([{ role: "DEPT_STAFF", departmentId: "dept-1" }]);
    expect(() => requireStaffOfAward(departmentStaff, { id: "award-1", departmentId: "dept-1" })).not.toThrow();
    expect(() => requireStaffOfAward(departmentStaff, { id: "award-2", departmentId: "dept-2" })).toThrow(ForbiddenError);
    const head = actor([{ role: "DEPT_HEAD", departmentId: "dept-1" }]);
    expect(() => requireDeptHead(head, "dept-1")).not.toThrow();
    expect(() => requireDeptHead(head, "dept-2")).toThrow(ForbiddenError);
    expect(() => requireJuryOfDepartment(actor([{ role: "JURY", departmentId: "dept-1" }]), "dept-2")).toThrow(ForbiddenError);
  });

  it("lets only the leader do the leader's work", () => {
    expect(() => requireLeader(actor([{ role: "LEADER" }]))).not.toThrow();
    expect(() => requireLeader(actor([{ role: "DEPT_HEAD", departmentId: "dept-1" }]))).toThrow(ForbiddenError);
  });

  it("answers 'not found' for another organisation, so its existence isn't revealed", () => {
    const applicant = applicantAccount(["org-1"]);
    expect(() => requireOrgMember(applicant, "org-1")).not.toThrow();
    expect(() => requireOrgMember(applicant, "org-2")).toThrow(NotFoundError);
  });

  it("records the highest role for actions on one's own account, and none for an applicant", () => {
    expect(primaryRole(actor([{ role: "JURY", departmentId: "j" }, { role: "DEPT_HEAD", departmentId: "d" }]))).toBe(
      "DEPT_HEAD",
    );
    expect(primaryRole(applicantAccount())).toBeNull();
  });

  it("keeps organisations, applying and the profile proof to applicant accounts (ADR 0016)", () => {
    expect(() => requireApplicantAccount(applicantAccount())).not.toThrow();
    expect(() => requireApplicantAccount(actor([{ role: "LEADER" }]))).toThrow(ForbiddenError);
    expect(() => requireApplicantAccount(actor([{ role: "AWARD_STAFF", awardId: "award-1" }]))).toThrow(ForbiddenError);
    // A platform account with no role yet still can't apply from this account.
    expect(() => requireApplicantAccount(actor())).toThrow(ForbiddenError);
  });
});
