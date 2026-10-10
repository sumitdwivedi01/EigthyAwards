import { randomUUID } from "node:crypto";
import type { Prisma } from "../../generated/prisma/client.js";
import { primaryRole, requireApplicantAccount, type Actor } from "../../lib/access.js";
import { clock } from "../../lib/clock.js";
import { db } from "../../lib/db.js";
import { NotFoundError, StateError, UnauthenticatedError, ValidationError } from "../../lib/errors.js";
import { normalizeEmail, normalizeName, normalizePhone } from "../../lib/normalize.js";
import { burnPasswordCheck, hashPassword, verifyPassword } from "../../lib/password.js";
import { isUniqueViolation } from "../../lib/prisma-errors.js";
import { signSession, verifySession } from "../../lib/session.js";
import { storage } from "../../lib/storage/index.js";
import { detectType, readHead } from "../../lib/storage/sniff.js";
import { recordAudit } from "../audit/service.js";
import { queueEmail } from "../notifications/service.js";
import type {
  ChangePasswordInput,
  LinkedinInput,
  LoginInput,
  RegisterInput,
  SetIdentityDocumentInput,
  StartIdentityUploadInput,
  UpdateProfileInput,
} from "./schemas.js";
import { identityUploadView, meInclude, meView, type IdentityUploadView, type MeView } from "./views.js";

/**
 * Accounts, sessions and My profile (spec §5.1, §5.21; ADR 0003, 0012). Every function except
 * register and login acts on the signed-in user's own account, so the actor is the scope.
 */

const EMAIL_TAKEN = "An account with this email already exists. Log in instead.";
const WRONG_LOGIN = "The email or password is wrong.";
const UPLOAD_LINK_SECONDS = 10 * 60;

export interface SessionResult {
  me: MeView;
  /** A new session token; the route puts it in the cookie. */
  token: string;
}

async function loadMe(userId: string): Promise<MeView> {
  return meView(await db.user.findUniqueOrThrow({ where: { id: userId }, include: meInclude }));
}

async function startSession(userId: string, sessionVersion: number): Promise<SessionResult> {
  return { me: await loadMe(userId), token: await signSession({ userId, sessionVersion }) };
}

/**
 * Registering creates an applicant account (spec §5.1, ADR 0016). Platform accounts (the leader,
 * heads, staff, jury) are created by the seed in Phase 1 and by invites from Phase 2.
 */
export async function register(input: RegisterInput): Promise<SessionResult> {
  const email = normalizeEmail(input.email);
  if (await db.user.findUnique({ where: { email }, select: { id: true } })) {
    throw new StateError(EMAIL_TAKEN);
  }
  const passwordHash = await hashPassword(input.password);
  try {
    const user = await db.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: { email, accountType: "APPLICANT", name: normalizeName(input.name), passwordHash },
        select: { id: true, sessionVersion: true },
      });
      await recordAudit(tx, {
        actorId: created.id,
        actorRole: null,
        action: "user.registered",
        entityType: "user",
        entityId: created.id,
      });
      return created;
    });
    return await startSession(user.id, user.sessionVersion);
  } catch (error) {
    // Two registrations with the same email at the same moment: the unique index decides.
    if (isUniqueViolation(error)) throw new StateError(EMAIL_TAKEN);
    throw error;
  }
}

export async function login(input: LoginInput): Promise<SessionResult> {
  const user = await db.user.findUnique({
    where: { email: normalizeEmail(input.email) },
    select: { id: true, passwordHash: true, sessionVersion: true, deactivatedAt: true },
  });
  if (!user?.passwordHash) {
    await burnPasswordCheck(input.password);
    throw new UnauthenticatedError(WRONG_LOGIN);
  }
  if (!(await verifyPassword(input.password, user.passwordHash))) {
    throw new UnauthenticatedError(WRONG_LOGIN);
  }
  if (user.deactivatedAt) {
    throw new UnauthenticatedError("This account has been deactivated.");
  }
  return startSession(user.id, user.sessionVersion);
}

/**
 * The actor behind a session token, read fresh from the database: null if the token is invalid
 * or expired, the account is deactivated, or the session version has moved on (spec §5.1, §5.21).
 */
export async function actorFromSession(token: string): Promise<Actor | null> {
  const claims = await verifySession(token);
  if (!claims) return null;
  const user = await db.user.findUnique({
    where: { id: claims.userId },
    select: {
      id: true,
      email: true,
      accountType: true,
      name: true,
      sessionVersion: true,
      deactivatedAt: true,
      roles: { where: { revokedAt: null }, select: { role: true, departmentId: true, awardId: true, cycleId: true } },
      memberships: { select: { organisationId: true } },
    },
  });
  if (!user || user.deactivatedAt || user.sessionVersion !== claims.sessionVersion) return null;
  return {
    userId: user.id,
    email: user.email,
    name: user.name,
    accountType: user.accountType,
    roles: user.roles,
    organisationIds: user.memberships.map((m) => m.organisationId),
  };
}

export function getMe(actor: Actor): Promise<MeView> {
  return loadMe(actor.userId);
}

/** Name and phone, normalised like all shared data (§5.18). */
export async function updateMyProfile(actor: Actor, input: UpdateProfileInput): Promise<MeView> {
  const data: Prisma.UserUpdateInput = {};
  if (input.name !== undefined) {
    data.name = normalizeName(input.name);
  }
  if (input.phone !== undefined) {
    if (input.phone === null || input.phone === "") {
      data.phone = null;
    } else {
      const phone = normalizePhone(input.phone);
      if (!phone) {
        throw new ValidationError("Some fields are invalid.", [
          { path: "phone", message: "Enter a 10-digit Indian phone number." },
        ]);
      }
      data.phone = phone;
    }
  }
  await db.user.update({ where: { id: actor.userId }, data });
  return loadMe(actor.userId);
}

/**
 * Needs the current password. In one transaction: the new hash, a higher session version (every
 * other session ends at once), an audit event without the password, and the "password changed"
 * email. The current session continues with a renewed token.
 */
export async function changePassword(actor: Actor, input: ChangePasswordInput): Promise<SessionResult> {
  const user = await db.user.findUniqueOrThrow({
    where: { id: actor.userId },
    select: { email: true, name: true, passwordHash: true },
  });
  if (!user.passwordHash || !(await verifyPassword(input.currentPassword, user.passwordHash))) {
    throw new ValidationError("The current password is wrong.", [
      { path: "currentPassword", message: "The current password is wrong." },
    ]);
  }
  if (input.newPassword === input.currentPassword) {
    throw new ValidationError("Choose a new password that is different from the current one.", [
      { path: "newPassword", message: "Choose a new password that is different from the current one." },
    ]);
  }
  const passwordHash = await hashPassword(input.newPassword);
  const updated = await db.$transaction(async (tx) => {
    const row = await tx.user.update({
      where: { id: actor.userId },
      data: { passwordHash, passwordChangedAt: clock.now(), sessionVersion: { increment: 1 } },
      select: { sessionVersion: true },
    });
    await recordAudit(tx, {
      actorId: actor.userId,
      actorRole: primaryRole(actor),
      action: "user.password_changed",
      entityType: "user",
      entityId: actor.userId,
    });
    await queueEmail(tx, { to: user.email, template: "password-changed", payload: { name: user.name } });
    return row;
  });
  return startSession(actor.userId, updated.sessionVersion);
}

/** The LinkedIn link on the profile, given once and reused by every application (§5.20). */
export async function setLinkedinUrl(actor: Actor, input: LinkedinInput): Promise<MeView> {
  requireApplicantAccount(actor);
  const url = input.url === null ? null : input.url.trim();
  await db.$transaction(async (tx) => {
    const before = await tx.user.findUniqueOrThrow({ where: { id: actor.userId }, select: { linkedinUrl: true } });
    await tx.user.update({ where: { id: actor.userId }, data: { linkedinUrl: url } });
    await recordAudit(tx, {
      actorId: actor.userId,
      actorRole: primaryRole(actor),
      action: "user.linkedin_changed",
      entityType: "user",
      entityId: actor.userId,
      before: { linkedinUrl: before.linkedinUrl },
      after: { linkedinUrl: url },
    });
  });
  return loadMe(actor.userId);
}

/** Keeps a file name readable but harmless: no folders, no control characters. */
function cleanFileName(name: string): string {
  return name.replace(/[\\/\p{Cc}]/gu, "_").trim().slice(0, 200) || "document";
}

/**
 * Step 1 of adding the identity document to the profile: records the file (with the consent)
 * and returns a short-lived link the browser uploads it to, straight to storage (GAPS G-B03).
 */
export async function startIdentityUpload(actor: Actor, input: StartIdentityUploadInput): Promise<IdentityUploadView> {
  requireApplicantAccount(actor);
  const fileId = randomUUID();
  const storageKey = `profiles/${actor.userId}/${fileId}`;
  await db.fileAsset.create({
    data: {
      id: fileId,
      kind: "IDENTITY_PROOF",
      ownerUserId: actor.userId,
      uploadedById: actor.userId,
      consentAt: clock.now(),
      storageKey,
      fileName: cleanFileName(input.fileName),
      mimeType: input.contentType,
      sizeBytes: input.sizeBytes,
    },
  });
  const link = await storage.createUploadLink(storageKey, {
    contentType: input.contentType,
    maxBytes: input.sizeBytes,
    expiresInSeconds: UPLOAD_LINK_SECONDS,
  });
  return identityUploadView(fileId, link);
}

/**
 * Step 2: once uploaded, the file becomes the profile's identity document. Its content is
 * checked against the declared type. Replacing a document is audited (§5.15); applications whose
 * proof isn't verified yet follow the profile (§5.20).
 */
export async function setIdentityDocument(actor: Actor, input: SetIdentityDocumentInput): Promise<MeView> {
  requireApplicantAccount(actor);
  const file = await db.fileAsset.findFirst({
    where: { id: input.fileId, ownerUserId: actor.userId, kind: "IDENTITY_PROOF" },
  });
  if (!file) throw new NotFoundError("File not found.");
  if (file.status === "READY") {
    throw new StateError("This file is already on your profile; upload a new one to replace it.");
  }
  const stored = await storage.statObject(file.storageKey);
  if (!stored) throw new StateError("The file hasn't been uploaded yet.");
  if (stored.sizeBytes === 0) {
    throw new ValidationError("The file is empty.", [{ path: "fileId", message: "The file is empty." }]);
  }
  const actualType = detectType(await readHead(await storage.getObject(file.storageKey)));
  if (actualType !== file.mimeType) {
    throw new ValidationError("The file's content doesn't match its type.", [
      { path: "fileId", message: "Upload a real PDF, JPG or PNG file." },
    ]);
  }
  await db.$transaction(async (tx) => {
    const before = await tx.user.findUniqueOrThrow({ where: { id: actor.userId }, select: { identityFileId: true } });
    await tx.fileAsset.update({ where: { id: file.id }, data: { status: "READY", sizeBytes: stored.sizeBytes } });
    await tx.user.update({ where: { id: actor.userId }, data: { identityFileId: file.id } });
    await recordAudit(tx, {
      actorId: actor.userId,
      actorRole: primaryRole(actor),
      action: before.identityFileId ? "user.identity_document_replaced" : "user.identity_document_added",
      entityType: "user",
      entityId: actor.userId,
      before: { identityFileId: before.identityFileId },
      after: { identityFileId: file.id },
    });
  });
  return loadMe(actor.userId);
}
