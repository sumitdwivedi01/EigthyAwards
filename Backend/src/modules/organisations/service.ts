import type { Organisation } from "../../generated/prisma/client.js";
import { primaryRole, requireOrgMember, type Actor } from "../../lib/access.js";
import { db } from "../../lib/db.js";
import { NotFoundError, StateError, ValidationError } from "../../lib/errors.js";
import {
  gstinMatchesPan,
  gstinStateCode,
  isValidGstin,
  isValidPan,
  normalizeEmail,
  normalizeName,
  normalizePhone,
  normalizePincode,
  normalizeTaxId,
} from "../../lib/normalize.js";
import { isUniqueViolation } from "../../lib/prisma-errors.js";
import { findState, isValidStateCode } from "../../lib/states.js";
import { recordAudit } from "../audit/service.js";
import type { CreateOrganisationInput, JoinOrganisationInput, UpdateOrganisationInput } from "./schemas.js";
import { organisationInclude, organisationView, type OrganisationResult, type OrganisationView } from "./views.js";

/**
 * Organisations: the legal bodies that apply and receive awards, one per PAN (spec §5.2). Every
 * value is normalised here, on the server, before it is saved (spec §5.18, ADR 0006); the
 * database repeats the format checks as CHECK constraints.
 */

interface FieldIssue {
  path: string;
  message: string;
}

/** Collects every invalid field, so the person fixes them all at once. */
class FieldIssues {
  readonly list: FieldIssue[] = [];

  add(path: string, message: string): void {
    this.list.push({ path, message });
  }

  throwIfAny(): void {
    if (this.list.length > 0) throw new ValidationError("Some fields are invalid.", this.list);
  }
}

/** The profile fields of a registration, or the ones an edit changes. */
type ProfileInput = Partial<Omit<CreateOrganisationInput, "pan">>;

interface ProfileData {
  legalName?: string;
  gstin?: string | null;
  addressLine?: string;
  city?: string;
  stateCode?: string;
  pincode?: string;
  officialEmail?: string;
  phone?: string;
  orgTypeId?: string | null;
  cin?: string | null;
  website?: string | null;
}

type CompleteProfile = Required<ProfileData> & { gstin: string | null };

const PAN_FORMAT = "A PAN is 5 letters, 4 digits and 1 letter (for example ABCDE1234F).";

function stateName(code: string): string {
  return findState(code)?.name ?? `state code ${code}`;
}

/** Normalises the fields present in the input; records an issue for each invalid one. */
async function normalizeProfile(input: ProfileInput, issues: FieldIssues): Promise<ProfileData> {
  const data: ProfileData = {};
  if (input.legalName !== undefined) data.legalName = normalizeName(input.legalName);
  if (input.addressLine !== undefined) data.addressLine = normalizeName(input.addressLine);
  if (input.city !== undefined) data.city = normalizeName(input.city);
  if (input.officialEmail !== undefined) data.officialEmail = normalizeEmail(input.officialEmail);
  if (input.stateCode !== undefined) {
    if (isValidStateCode(input.stateCode)) data.stateCode = input.stateCode;
    else issues.add("stateCode", "Pick a state from the list.");
  }
  if (input.pincode !== undefined) {
    const pincode = normalizePincode(input.pincode);
    if (pincode) data.pincode = pincode;
    else issues.add("pincode", "A PIN code is 6 digits and doesn't start with 0.");
  }
  if (input.phone !== undefined) {
    const phone = normalizePhone(input.phone);
    if (phone) data.phone = phone;
    else issues.add("phone", "Enter a 10-digit Indian phone number.");
  }
  if (input.gstin !== undefined) {
    if (!input.gstin) {
      data.gstin = null;
    } else {
      const gstin = normalizeTaxId(input.gstin);
      if (isValidGstin(gstin)) data.gstin = gstin;
      else issues.add("gstin", "A GSTIN is 15 characters: 2 digits, the PAN, then 3 more (for example 27ABCDE1234F1Z5).");
    }
  }
  if (input.cin !== undefined) data.cin = input.cin ? normalizeTaxId(input.cin) : null;
  if (input.website !== undefined) data.website = input.website ? input.website.trim() : null;
  if (input.orgTypeId !== undefined) {
    if (input.orgTypeId === null) {
      data.orgTypeId = null;
    } else {
      // Picked from master data, and only from values that aren't retired (spec §5.18).
      const type = await db.organisationType.findUnique({ where: { id: input.orgTypeId } });
      if (type && !type.retiredAt) data.orgTypeId = type.id;
      else issues.add("orgTypeId", "Pick an organisation type from the list.");
    }
  }
  return data;
}

/** The GSTIN must contain the PAN; a GSTIN from another state than the address only warns (spec §5.18, A17). */
function checkGstin(pan: string, gstin: string | null | undefined, stateCode: string | undefined, issues: FieldIssues): string[] {
  if (!gstin) return [];
  if (!gstinMatchesPan(gstin, pan)) {
    issues.add("gstin", "Characters 3 to 12 of the GSTIN must be the organisation's PAN.");
    return [];
  }
  const gstState = gstinStateCode(gstin);
  if (stateCode && gstState !== stateCode) {
    return [
      `The GSTIN is registered in ${stateName(gstState)}, but the address is in ${stateName(stateCode)}. ` +
        "That's fine for a GSTIN from a branch in another state; otherwise, please check both.",
    ];
  }
  return [];
}

function completeProfile(data: ProfileData): CompleteProfile {
  const { legalName, addressLine, city, stateCode, pincode, officialEmail, phone } = data;
  if (!legalName || !addressLine || !city || !stateCode || !pincode || !officialEmail || !phone) {
    // Unreachable: the schema requires these, and an invalid one has already been reported.
    throw new Error("An organisation was saved without a required field");
  }
  return {
    legalName,
    addressLine,
    city,
    stateCode,
    pincode,
    officialEmail,
    phone,
    gstin: data.gstin ?? null,
    orgTypeId: data.orgTypeId ?? null,
    cin: data.cin ?? null,
    website: data.website ?? null,
  };
}

/** The identity fields as the audit history records them (before and after values). */
function snapshot(org: Organisation): Record<string, string | null> {
  return {
    legalName: org.legalName,
    pan: org.pan,
    gstin: org.gstin,
    addressLine: org.addressLine,
    city: org.city,
    stateCode: org.stateCode,
    pincode: org.pincode,
    officialEmail: org.officialEmail,
    phone: org.phone,
    orgTypeId: org.orgTypeId,
    cin: org.cin,
    website: org.website,
  };
}

function panRegistered(): StateError {
  return new StateError("An organisation with this PAN is already registered. Join it instead.", {
    reason: "PAN_REGISTERED",
  });
}

/** Registers an organisation; the person registering it becomes its first member. */
export async function createOrganisation(actor: Actor, input: CreateOrganisationInput): Promise<OrganisationResult> {
  const issues = new FieldIssues();
  const pan = normalizeTaxId(input.pan);
  if (!isValidPan(pan)) issues.add("pan", PAN_FORMAT);
  const profile = await normalizeProfile(input, issues);
  const warnings = isValidPan(pan) ? checkGstin(pan, profile.gstin, profile.stateCode, issues) : [];
  issues.throwIfAny();

  // One record per PAN: a second registration is sent to Join instead (spec §5.2).
  if (await db.organisation.findUnique({ where: { pan }, select: { id: true } })) throw panRegistered();
  try {
    const organisation = await db.$transaction(async (tx) => {
      const created = await tx.organisation.create({
        data: { ...completeProfile(profile), pan, createdById: actor.userId },
        include: organisationInclude,
      });
      await tx.organisationMember.create({ data: { organisationId: created.id, userId: actor.userId } });
      await recordAudit(tx, {
        actorId: actor.userId,
        actorRole: primaryRole(actor),
        action: "organisation.created",
        entityType: "organisation",
        entityId: created.id,
        after: snapshot(created),
      });
      return created;
    });
    return { organisation: organisationView(organisation), warnings };
  } catch (error) {
    // Two people registering the same PAN at the same moment: the unique index decides.
    if (isUniqueViolation(error)) throw panRegistered();
    throw error;
  }
}

/**
 * Joins an existing organisation with its PAN and GSTIN, or its PAN and official email when it has
 * no GSTIN (spec §5.2). The PAN is normalised, so "abcde 1234f" finds ABCDE1234F.
 */
export async function joinOrganisation(actor: Actor, input: JoinOrganisationInput): Promise<OrganisationResult> {
  const organisation = await db.organisation.findUnique({
    where: { pan: normalizeTaxId(input.pan) },
    include: organisationInclude,
  });
  if (!organisation) {
    throw new NotFoundError("No organisation is registered with this PAN. Check it, or register the organisation.");
  }
  if (organisation.gstin) {
    if (!input.gstin) {
      throw new ValidationError("This organisation has a GSTIN on record.", [
        { path: "gstin", message: "This organisation has a GSTIN on record: enter it to join." },
      ]);
    }
    if (normalizeTaxId(input.gstin) !== organisation.gstin) {
      // GAPS G-H05: one GSTIN is on record, so the message says which state's to use.
      throw new ValidationError("The GSTIN doesn't match.", [
        {
          path: "gstin",
          message: `This GSTIN doesn't match the one on record, which is registered in ${stateName(gstinStateCode(organisation.gstin))}.`,
        },
      ]);
    }
  } else if (!input.officialEmail || normalizeEmail(input.officialEmail) !== normalizeEmail(organisation.officialEmail)) {
    throw new ValidationError("The official email doesn't match.", [
      {
        path: "officialEmail",
        message: "This organisation has no GSTIN on record: join with its official email address.",
      },
    ]);
  }

  const alreadyMember = await db.organisationMember.findUnique({
    where: { organisationId_userId: { organisationId: organisation.id, userId: actor.userId } },
  });
  if (!alreadyMember) {
    await db.$transaction(async (tx) => {
      await tx.organisationMember.create({ data: { organisationId: organisation.id, userId: actor.userId } });
      await recordAudit(tx, {
        actorId: actor.userId,
        actorRole: primaryRole(actor),
        action: "organisation.member_joined",
        entityType: "organisation",
        entityId: organisation.id,
        after: { userId: actor.userId },
      });
    });
  }
  return { organisation: organisationView(organisation), warnings: [] };
}

export async function listMyOrganisations(actor: Actor): Promise<OrganisationView[]> {
  const rows = await db.organisation.findMany({
    where: { members: { some: { userId: actor.userId } } },
    include: organisationInclude,
    orderBy: { legalName: "asc" },
  });
  return rows.map(organisationView);
}

export async function getOrganisation(actor: Actor, organisationId: string): Promise<OrganisationView> {
  requireOrgMember(actor, organisationId);
  const organisation = await db.organisation.findUnique({ where: { id: organisationId }, include: organisationInclude });
  if (!organisation) throw new NotFoundError("Organisation not found.");
  return organisationView(organisation);
}

/** A member edits the profile (never the PAN); the change is audited with before and after (spec §5.2). */
export async function updateOrganisation(
  actor: Actor,
  organisationId: string,
  input: UpdateOrganisationInput,
): Promise<OrganisationResult> {
  requireOrgMember(actor, organisationId);
  const current = await db.organisation.findUnique({ where: { id: organisationId } });
  if (!current) throw new NotFoundError("Organisation not found.");

  const issues = new FieldIssues();
  const changes = await normalizeProfile(input, issues);
  const warnings =
    changes.gstin !== undefined || changes.stateCode !== undefined
      ? checkGstin(
          current.pan,
          changes.gstin !== undefined ? changes.gstin : current.gstin,
          changes.stateCode ?? current.stateCode,
          issues,
        )
      : [];
  issues.throwIfAny();

  const organisation = await db.$transaction(async (tx) => {
    const updated = await tx.organisation.update({
      where: { id: organisationId },
      data: changes,
      include: organisationInclude,
    });
    const keys = Object.keys(changes);
    const pick = (values: Record<string, string | null>) => Object.fromEntries(keys.map((k) => [k, values[k] ?? null]));
    await recordAudit(tx, {
      actorId: actor.userId,
      actorRole: primaryRole(actor),
      action: "organisation.updated",
      entityType: "organisation",
      entityId: organisationId,
      before: pick(snapshot(current)),
      after: pick(snapshot(updated)),
    });
    return updated;
  });
  return { organisation: organisationView(organisation), warnings };
}
