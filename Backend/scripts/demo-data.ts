/**
 * Builds the demo (docs/DEMO.md) through the platform's own API, exactly as people would on screen:
 * applicants register their companies, upload their proof and apply; staff set up four awards
 * that work differently; jury score; heads approve; staff publish. Every rule, audit event,
 * snapshot and file is therefore real. Run it on an emptied, freshly seeded database:
 *
 *   npm run db:wipe -- --confirm <host>   (empties the tables)
 *   npx prisma db seed                    (the people: leader, heads, staff, jury)
 *   npm run demo:data                     (this script: about 12 minutes)
 *
 * Options: --app <frontend URL> (default APP_URL), --api <API URL> (default <app>/api),
 * --minutes <n> (default 8): how long the three "already judged" awards stay open, so their
 * applications can be submitted before the deadline. Production can't move the clock, so the
 * script waits for that deadline, then judges.
 *
 * The passwords come from the environment file (.env, or ENV_FILE such as .env.live):
 * LEADER_EMAIL, LEADER_PASSWORD, DEMO_PASSWORD. They are never printed.
 */
import { createHash } from "node:crypto";
import { config as loadEnv } from "dotenv";
import { z } from "zod";
import {
  APPLICANTS,
  AWARDS,
  DESIGN_PLAN,
  ENERGY_PLAN,
  FPO_PLAN,
  NOTES,
  ORGS,
  SAFETY_PLAN,
  type AnswerValue,
  type ApplicationSpec,
  type AwardSpec,
  type QuestionSpec,
} from "./demo-content.js";

loadEnv({ path: process.env["ENV_FILE"] ?? ".env", quiet: true });

// ── Settings ──

function argument(name: string): string | undefined {
  const at = process.argv.indexOf(`--${name}`);
  return at >= 0 ? process.argv[at + 1] : undefined;
}

const secrets = z
  .object({ LEADER_EMAIL: z.email(), LEADER_PASSWORD: z.string().min(8), DEMO_PASSWORD: z.string().min(8), APP_URL: z.url().optional() })
  .parse(process.env);
const APP = (argument("app") ?? secrets.APP_URL ?? "").replace(/\/$/, "");
if (!APP) throw new Error("Give the frontend's address with --app https://… (or APP_URL in the environment file).");
const APP_ORIGIN = new URL(APP).origin;
const API = (argument("api") ?? `${APP}/api`).replace(/\/$/, "");
const API_ORIGIN = new URL(API).origin;
const WINDOW_MINUTES = Number(argument("minutes") ?? "8");

// ── HTTP ──

interface Session {
  email: string;
  cookie: string;
}

class ApiFailure extends Error {
  constructor(
    readonly status: number,
    readonly body: unknown,
    message: string,
  ) {
    super(message);
  }
  get reason(): string | undefined {
    const details = (this.body as { error?: { details?: { reason?: unknown } } } | undefined)?.error?.details;
    return typeof details?.reason === "string" ? details.reason : undefined;
  }
}

function describe(body: unknown): string {
  const error = (body as { error?: { message?: unknown; details?: unknown } } | undefined)?.error;
  if (!error) return JSON.stringify(body)?.slice(0, 400) ?? "";
  return `${String(error.message)}${error.details ? ` ${JSON.stringify(error.details).slice(0, 600)}` : ""}`;
}

function sessionCookie(response: Response): string | null {
  for (const header of response.headers.getSetCookie()) {
    const match = /^awards_session=([^;]*)/.exec(header);
    if (match?.[1]) return `awards_session=${match[1]}`;
  }
  return null;
}

async function call<T>(session: Session | null, method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = { origin: APP_ORIGIN, accept: "application/json" };
  if (body !== undefined) headers["content-type"] = "application/json";
  if (session) headers["cookie"] = session.cookie;
  const response = await fetch(`${API}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await response.text();
  let data: unknown = undefined;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text.slice(0, 300);
    }
  }
  if (!response.ok) throw new ApiFailure(response.status, data, `${method} ${path} → ${response.status}: ${describe(data)}`);
  const renewed = sessionCookie(response);
  if (session && renewed) session.cookie = renewed;
  return data as T;
}

const sessions = new Map<string, Session>();

function passwordOf(email: string): string {
  return email === secrets.LEADER_EMAIL ? secrets.LEADER_PASSWORD : secrets.DEMO_PASSWORD;
}

async function signIn(email: string): Promise<Session> {
  const known = sessions.get(email);
  if (known) return known;
  const response = await fetch(`${API}/auth/login`, {
    method: "POST",
    headers: { origin: APP_ORIGIN, "content-type": "application/json" },
    body: JSON.stringify({ email, password: passwordOf(email) }),
  });
  if (!response.ok) {
    throw new Error(`Can't log in as ${email} (${response.status}). Was the database seeded with the same DEMO_PASSWORD and LEADER_PASSWORD?`);
  }
  const cookie = sessionCookie(response);
  if (!cookie) throw new Error(`No session cookie for ${email}`);
  const session = { email, cookie };
  sessions.set(email, session);
  return session;
}

/** Applicants register themselves, as on the website; a second run logs them in instead. */
async function applicantSession(email: string, name: string): Promise<Session> {
  const known = sessions.get(email);
  if (known) return known;
  const response = await fetch(`${API}/auth/register`, {
    method: "POST",
    headers: { origin: APP_ORIGIN, "content-type": "application/json" },
    body: JSON.stringify({ name, email, password: secrets.DEMO_PASSWORD }),
  });
  if (response.status === 409) return signIn(email);
  if (!response.ok) throw new Error(`Can't register ${email}: ${response.status} ${await response.text()}`);
  const cookie = sessionCookie(response);
  if (!cookie) throw new Error(`No session cookie for ${email}`);
  const session = { email, cookie };
  sessions.set(email, session);
  return session;
}

// ── Files: small, real PDFs (the API checks the bytes) ──

function pdf(title: string, lines: string[]): Buffer {
  const ascii = (text: string) => text.replace(/[^\x20-\x7E]/g, "-").replace(/([\\()])/g, "\\$1");
  const body = [`BT /F1 18 Tf 60 780 Td (${ascii(title)}) Tj ET`, ...lines.map((line, i) => `BT /F1 11 Tf 60 ${740 - i * 18} Td (${ascii(line)}) Tj ET`)].join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${Buffer.byteLength(body, "latin1")} >>\nstream\n${body}\nendstream`,
  ];
  let out = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((object, i) => {
    offsets.push(Buffer.byteLength(out, "latin1"));
    out += `${i + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = Buffer.byteLength(out, "latin1");
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("")}`;
  out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(out, "latin1");
}

interface UploadStart {
  fileId: string;
  upload: { url: string; method: string; headers: Record<string, string> };
}

async function uploadPdf(session: Session, startPath: string, extra: Record<string, unknown>, fileName: string, bytes: Buffer): Promise<string> {
  const started = await call<UploadStart>(session, "POST", startPath, { fileName, contentType: "application/pdf", sizeBytes: bytes.length, ...extra });
  const url = new URL(started.upload.url, API_ORIGIN);
  const response = await fetch(url, { method: started.upload.method, headers: started.upload.headers, body: new Uint8Array(bytes) });
  if (!response.ok) throw new Error(`Upload of ${fileName} failed: ${response.status} ${(await response.text()).slice(0, 200)}`);
  return started.fileId;
}

// ── Small helpers ──

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const hash = (text: string) => createHash("sha256").update(text).digest().readUInt32BE(0);
const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value));

function log(line: string): void {
  const time = new Date().toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour12: false });
  console.log(`[${time}] ${line}`);
}

/** A date in India time, as the employment proof takes it: 18 days ago. */
function recentDocumentDate(): string {
  const date = new Date(Date.now() - 18 * 24 * 3600 * 1000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(date);
}

function orgOf(applicantEmail: string) {
  const applicant = APPLICANTS.find((a) => a.email === applicantEmail);
  const org = ORGS.find((o) => o.key === applicant?.org);
  if (!applicant || !org) throw new Error(`Unknown applicant ${applicantEmail}`);
  return { applicant, org };
}

// ── API shapes this script reads ──

interface Me {
  identityDocument: unknown;
  linkedinUrl: string | null;
  organisations: { id: string }[];
}
interface Department {
  id: string;
  name: string;
}
interface ListItem {
  id: string;
  name: string;
}
interface Award {
  id: string;
}
interface CycleSetup {
  id: string;
  round: { id: string };
  categories: { id: string; name: string }[];
  publishIssues: string[];
}
interface FormBuilder {
  draft: { sections: { questions: { key: string }[] }[] };
}
interface Sheet {
  sections: { indicators: { key: string; label: string }[] }[];
}
interface Application {
  id: string;
  fee: { amountPaise: number; paid: boolean };
  missing: { path: string; message: string }[];
}
interface Board {
  jury: { id: string; email: string; name: string }[];
  organisations: { id: string; name: string }[];
}
interface JuryHome {
  departments: { cycles: { roundId: string; items: { evaluationId: string; reference: string }[] }[] }[];
}
interface JuryEvaluation {
  id: string;
  reference: string;
  sections: { questions: { type: string; answer: AnswerValue | null; indicators: { key: string; type: "SCORE" | "YES_NO" }[] }[] }[];
  otherIndicators: { key: string; type: "SCORE" | "YES_NO" }[];
}
interface Judging {
  applications: { id: string; evaluations: { id: string; juror: { email: string }; marks: Record<string, number> }[] }[];
  sheet: { indicators: { key: string; label: string }[] }[];
  sendBlockers: string[];
}

interface BuiltAward {
  spec: AwardSpec;
  staff: Session;
  awardId: string;
  cycleId: string;
  roundId: string;
  categories: Map<string, string>;
  questionKeys: Map<string, string>;
  questions: Map<string, QuestionSpec>;
  /** Application id by applicant email; and the spec behind each id. */
  applications: Map<string, string>;
  specs: Map<string, ApplicationSpec>;
}

// ── 1. The people and their companies ──

async function prepareApplicants(states: Set<string>, types: Map<string, string>): Promise<void> {
  const identityPdf = (name: string) => pdf("Identity card (demo)", [`Name: ${name}`, "Masked Aadhaar: XXXX XXXX 4821", "This is a demonstration document."]);
  for (const person of APPLICANTS) {
    const { org } = orgOf(person.email);
    const session = await applicantSession(person.email, person.name);
    await call<Me>(session, "PATCH", "/me/profile", { phone: person.phone });
    let me = await call<Me>(session, "GET", "/me");
    if (me.organisations.length === 0) {
      if (!states.has(org.stateCode)) throw new Error(`Unknown state code ${org.stateCode}`);
      const join = () => call(session, "POST", "/organisations/join", org.gstin ? { pan: org.pan, gstin: org.gstin } : { pan: org.pan, officialEmail: org.officialEmail });
      if (person.joins) {
        await join();
      } else {
        try {
          await call(session, "POST", "/organisations", {
            pan: org.pan,
            legalName: org.legalName,
            gstin: org.gstin,
            addressLine: org.addressLine,
            city: org.city,
            stateCode: org.stateCode,
            pincode: org.pincode,
            officialEmail: org.officialEmail,
            phone: org.phone,
            orgTypeId: types.get(org.type) ?? null,
            website: org.website ?? null,
          });
        } catch (error) {
          if (error instanceof ApiFailure && error.reason === "PAN_REGISTERED") await join();
          else throw error;
        }
      }
    }
    me = await call<Me>(session, "GET", "/me");
    if (!me.linkedinUrl) {
      const slug = person.name.toLowerCase().replace(/[^a-z]+/g, "-");
      await call(session, "PUT", "/me/linkedin", { url: `https://www.linkedin.com/in/${slug}-demo` });
    }
    if (!me.identityDocument) {
      const fileId = await uploadPdf(session, "/me/identity-document/uploads", { consent: true }, "photo-id.pdf", identityPdf(person.name));
      await call(session, "PUT", "/me/identity-document", { fileId });
    }
    log(`Applicant ready: ${person.name} (${org.legalName})`);
  }
}

// ── 2. The awards, set up by their staff ──

async function setUpAward(spec: AwardSpec, departments: Map<string, string>, domains: Map<string, string>, closesAt: Date): Promise<BuiltAward> {
  const staff = await signIn(spec.staff);
  const departmentId = departments.get(spec.department);
  const domainId = domains.get(spec.domain);
  if (!departmentId || !domainId) throw new Error(`Missing department or domain for ${spec.name}`);
  const award = await call<Award>(staff, "POST", "/awards", { departmentId, name: spec.name, domainId, description: spec.description });
  await call(staff, "PUT", `/awards/${award.id}/site`, { slug: spec.slug });
  const deadlineAt = spec.deadline === "soon" ? closesAt.toISOString() : spec.deadline;
  let cycle = await call<CycleSetup>(staff, "POST", `/awards/${award.id}/cycles`, { label: spec.edition, opensAt: spec.opensAt, deadlineAt });
  await call(staff, "PATCH", `/cycles/${cycle.id}`, { feePaise: spec.feePaise, blindJudging: spec.blind, maxEntries: spec.maxEntries });
  for (const category of spec.categories) {
    cycle = await call<CycleSetup>(staff, "POST", `/cycles/${cycle.id}/categories`, { name: category.name, feePaise: category.feePaise });
  }
  await call(staff, "PATCH", `/rounds/${cycle.round.id}`, { juryMin: spec.juryMin, juryMax: spec.juryMax });

  const draft = {
    sections: spec.sections.map((section) => ({
      title: section.title,
      description: section.description,
      questions: section.questions.map((q) => ({
        type: q.type,
        label: q.label,
        help: q.help ?? "",
        required: q.required ?? true,
        ...(q.min !== undefined && { min: q.min }),
        ...(q.max !== undefined && { max: q.max }),
        ...(q.options && { options: q.options.map((label) => ({ label })) }),
        ...(q.type === "FILE_UPLOAD" && { maxFiles: q.maxFiles ?? 1, fileTypes: q.fileTypes ?? ["pdf"] }),
      })),
    })),
  };
  const form = await call<FormBuilder>(staff, "PUT", `/cycles/${cycle.id}/form-draft`, draft);
  const questionKeys = new Map<string, string>();
  const questions = new Map<string, QuestionSpec>();
  spec.sections.forEach((section, s) =>
    section.questions.forEach((q, i) => {
      const key = form.draft.sections[s]?.questions[i]?.key;
      if (!key) throw new Error(`No key for question ${q.id}`);
      questionKeys.set(q.id, key);
      questions.set(q.id, q);
    }),
  );
  await call(staff, "POST", `/cycles/${cycle.id}/form-versions`, { changeSummary: "First version" });

  const sheet = {
    sections: spec.sheet.map((section) => ({
      title: section.title,
      weight: section.weight,
      indicators: section.indicators.map((indicator) => ({
        label: indicator.label,
        type: indicator.type,
        weight: indicator.weight,
        questionKey: questionKeys.get(indicator.question),
      })),
    })),
  };
  await call<Sheet>(staff, "PUT", `/rounds/${cycle.round.id}/scoring-sheet`, sheet);
  try {
    cycle = await call<CycleSetup>(staff, "POST", `/cycles/${cycle.id}/publish`);
  } catch (error) {
    throw new Error(`${spec.name} can't be published: ${error instanceof Error ? error.message : String(error)}`, { cause: error });
  }
  log(`Award published: ${spec.name} ${spec.edition} (${spec.department})`);
  return {
    spec,
    staff,
    awardId: award.id,
    cycleId: cycle.id,
    roundId: cycle.round.id,
    categories: new Map(cycle.categories.map((c) => [c.name, c.id])),
    questionKeys,
    questions,
    applications: new Map(),
    specs: new Map(),
  };
}

// ── 3. Applying ──

async function apply(award: BuiltAward, app: ApplicationSpec, closesAt: Date | null): Promise<void> {
  if (closesAt && closesAt.getTime() - Date.now() < 40_000) {
    throw new Error(
      `Too close to ${award.spec.name}'s deadline to submit safely. Wipe the database and run again with a longer window, for example --minutes ${WINDOW_MINUTES + 4}.`,
    );
  }
  const { applicant, org } = orgOf(app.applicant);
  const session = await signIn(applicant.email);
  const categoryId = award.categories.get(app.category);
  if (!categoryId) throw new Error(`Unknown category ${app.category}`);
  let application = await call<Application>(session, "POST", `/cycles/${award.cycleId}/applications`, { categoryId });
  award.applications.set(applicant.email, application.id);
  award.specs.set(application.id, app);
  if (application.fee.amountPaise > 0 && !application.fee.paid) {
    application = await call<Application>(session, "POST", `/applications/${application.id}/payment`);
  }
  const answers: Record<string, AnswerValue> = {};
  for (const [id, value] of Object.entries(app.answers)) {
    const key = award.questionKeys.get(id);
    const question = award.questions.get(id);
    if (!key || !question) throw new Error(`Unknown question ${id}`);
    if (question.type === "SINGLE_CHOICE") {
      // A choice is sent as its option key: read it from the published form.
      answers[key] = await optionKey(session, award, key, String(value));
    } else {
      answers[key] = value;
    }
  }
  const saved = await call<{ problems: { questionKey: string; message: string }[] }>(session, "PUT", `/applications/${application.id}/answers`, { answers });
  if (saved.problems.length > 0) throw new Error(`${org.legalName}: answers refused: ${JSON.stringify(saved.problems)}`);
  for (const [id, names] of Object.entries(app.files ?? {})) {
    const key = award.questionKeys.get(id);
    if (!key) throw new Error(`Unknown file question ${id}`);
    for (const name of names) {
      const bytes = pdf(name.replace(/\.pdf$/, "").replace(/-/g, " "), [org.legalName, `${award.spec.name} ${award.spec.edition}`, "A demonstration document."]);
      const fileId = await uploadPdf(session, `/applications/${application.id}/files`, { questionKey: key }, name, bytes);
      await call(session, "PUT", `/applications/${application.id}/files/${fileId}`, {});
    }
  }
  if (app.draft && !app.withProof) {
    log(`  draft left by ${applicant.name} (${org.legalName})`);
    return;
  }
  const proof = pdf("Letter of employment (demo)", [org.legalName, `This is to certify that ${applicant.name} works with us.`, `Dated ${recentDocumentDate()}.`]);
  const proofId = await uploadPdf(
    session,
    `/applications/${application.id}/employment-proof/uploads`,
    { documentDate: recentDocumentDate(), consent: true },
    "employment-letter.pdf",
    proof,
  );
  application = await call<Application>(session, "PUT", `/applications/${application.id}/employment-proof`, { fileId: proofId });
  if (app.draft) return;
  await call(session, "POST", `/applications/${application.id}/submit`);
  log(`  submitted: ${org.legalName} → ${award.spec.name}`);
}

const optionKeys = new Map<string, Map<string, string>>();

async function optionKey(session: Session, award: BuiltAward, questionKey: string, label: string): Promise<string> {
  let options = optionKeys.get(questionKey);
  if (!options) {
    const info = await call<{ form: { sections: { questions: { key: string; options?: { key: string; label: string }[] }[] }[] } }>(
      session,
      "GET",
      `/applications/${award.applications.get(session.email) ?? ""}`,
    );
    const question = info.form.sections.flatMap((s) => s.questions).find((q) => q.key === questionKey);
    options = new Map((question?.options ?? []).map((o) => [o.label, o.key]));
    optionKeys.set(questionKey, options);
  }
  const key = options.get(label);
  if (!key) throw new Error(`No option "${label}"`);
  return key;
}

// ── 4. Checking proof, conflicts, assigning, scoring, approving ──

async function checkProof(award: BuiltAward, applicantEmail: string, decision: "VERIFIED" | "REJECTED", note?: string): Promise<void> {
  const id = award.applications.get(applicantEmail);
  if (!id) throw new Error(`${applicantEmail} has no application in ${award.spec.name}`);
  await call(award.staff, "POST", `/applications/${id}/proof-check`, decision === "VERIFIED" ? { decision } : { decision, note });
}

async function assign(award: BuiltAward, plan: Record<string, string[]>): Promise<void> {
  const board = await call<Board>(award.staff, "GET", `/rounds/${award.roundId}/assignment-board`);
  const juryId = (email: string) => {
    const juror = board.jury.find((j) => j.email === email);
    if (!juror) throw new Error(`${email} isn't on ${award.spec.department}'s jury list`);
    return juror.id;
  };
  for (const [applicantEmail, jurors] of Object.entries(plan)) {
    const applicationId = award.applications.get(applicantEmail);
    if (!applicationId) throw new Error(`No application from ${applicantEmail}`);
    await call(award.staff, "POST", `/rounds/${award.roundId}/assignments`, { applicationIds: [applicationId], juryUserIds: jurors.map(juryId) });
  }
  log(`Assigned ${Object.keys(plan).length} applications in ${award.spec.name}`);
}

function referenceOf(applicationId: string): string {
  return `Entry ${applicationId.replace(/-/g, "").slice(0, 6).toUpperCase()}`;
}

function noteFor(strength: number, seed: string): string {
  const band = strength >= 0.82 ? "high" : strength >= 0.68 ? "good" : strength >= 0.55 ? "fair" : "low";
  const options = NOTES[band];
  return options[hash(seed) % options.length] ?? options[0] ?? "";
}

/** Every juror in the plan scores their applications in this round and submits. */
async function score(award: BuiltAward, plan: Record<string, string[]>): Promise<void> {
  const byReference = new Map([...award.specs.entries()].map(([id, spec]) => [referenceOf(id), spec]));
  const jurors = [...new Set(Object.values(plan).flat())];
  for (const email of jurors) {
    const session = await signIn(email);
    const bias = (hash(email) % 3) - 1;
    const home = await call<JuryHome>(session, "GET", "/jury/evaluations");
    const items = home.departments.flatMap((d) => d.cycles).filter((c) => c.roundId === award.roundId).flatMap((c) => c.items);
    for (const item of items) {
      const app = byReference.get(item.reference);
      if (!app) throw new Error(`Unknown application ${item.reference}`);
      const evaluation = await call<JuryEvaluation>(session, "GET", `/evaluations/${item.evaluationId}`);
      const scores: Record<string, number> = {};
      let index = 0;
      for (const question of evaluation.sections.flatMap((s) => s.questions)) {
        for (const indicator of question.indicators) {
          if (indicator.type === "YES_NO") {
            scores[indicator.key] = question.answer === true || (question.answer === null && app.strength > 0.6) ? 1 : 0;
          } else {
            const noise = (hash(`${email}|${item.reference}|${index}`) % 3) - 1;
            scores[indicator.key] = clamp(Math.round(2 + app.strength * 8 + bias * 0.6 + noise), 0, 10);
          }
          index += 1;
        }
      }
      for (const indicator of evaluation.otherIndicators) scores[indicator.key] = clamp(Math.round(2 + app.strength * 8), 0, 10);
      await call(session, "PUT", `/evaluations/${item.evaluationId}/scores`, { scores, overallNote: noteFor(app.strength, `${email}|${item.reference}`) });
      await call(session, "POST", `/evaluations/${item.evaluationId}/submit`);
    }
    log(`  ${email} scored ${items.length} in ${award.spec.name}`);
  }
}

// ── The run ──

async function waitForApi(): Promise<void> {
  log(`API: ${API} (frontend ${APP_ORIGIN})`);
  for (let attempt = 1; attempt <= 30; attempt += 1) {
    try {
      const response = await fetch(`${API}/health`);
      if (response.ok) return;
    } catch {
      // The free server may be waking up.
    }
    log(`Waiting for the API to wake up (${attempt})…`);
    await sleep(8000);
  }
  throw new Error("The API didn't answer. Is the address right, and is the service running?");
}

async function main(): Promise<void> {
  await waitForApi();
  const leader = await signIn(secrets.LEADER_EMAIL);
  const departmentList = await call<Department[]>(leader, "GET", "/departments");
  const departments = new Map(departmentList.map((d) => [d.name, d.id]));
  for (const spec of AWARDS) {
    if (!departments.has(spec.department)) throw new Error(`The department "${spec.department}" is missing: run the seed first (npx prisma db seed).`);
  }
  for (const spec of AWARDS) {
    const mine = await call<Award[]>(await signIn(spec.staff), "GET", "/awards/mine");
    if (mine.length > 0) throw new Error(`${spec.department} already runs an award. Start from an empty database: npm run db:wipe, then the seed (docs/DEMO.md).`);
  }
  const domains = new Map((await call<ListItem[]>(null, "GET", "/master-data/award-domains")).map((d) => [d.name, d.id]));
  const types = new Map((await call<ListItem[]>(null, "GET", "/master-data/organisation-types")).map((t) => [t.name, t.id]));
  const states = new Set((await call<{ code: string }[]>(null, "GET", "/master-data/states")).map((s) => s.code));

  log(`Preparing ${APPLICANTS.length} applicants and their companies…`);
  await prepareApplicants(states, types);

  // The three awards judged in this run close a few minutes from now; FPO stays open.
  const closesAt = new Date(Date.now() + WINDOW_MINUTES * 60_000);
  log(`Safety, Energy and Design close at ${closesAt.toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata" })} India time.`);
  const built = new Map<string, BuiltAward>();
  for (const spec of AWARDS.filter((a) => a.deadline === "soon")) built.set(spec.key, await setUpAward(spec, departments, domains, closesAt));
  for (const key of ["safety", "energy", "design"]) {
    const award = built.get(key);
    if (!award) continue;
    for (const app of award.spec.applications) await apply(award, app, closesAt);
  }

  // Meanwhile: the open award, its applications and a few proof checks.
  const fpoSpec = AWARDS.find((a) => a.key === "fpo");
  if (!fpoSpec) throw new Error("No FPO award");
  const fpo = await setUpAward(fpoSpec, departments, domains, closesAt);
  for (const app of fpo.spec.applications) await apply(fpo, app, null);
  for (const email of FPO_PLAN.verify) await checkProof(fpo, email, "VERIFIED");
  await checkProof(fpo, FPO_PLAN.reject.applicant, "REJECTED", FPO_PLAN.reject.note);
  log("FPO Excellence: open, with proofs partly checked.");

  while (Date.now() < closesAt.getTime() + 20_000) {
    log(`Waiting for the deadline (${Math.ceil((closesAt.getTime() + 20_000 - Date.now()) / 1000)} s)…`);
    await sleep(Math.min(30_000, closesAt.getTime() + 20_000 - Date.now() + 100));
  }

  const safety = built.get("safety");
  const energy = built.get("energy");
  const design = built.get("design");
  if (!safety || !energy || !design) throw new Error("An award is missing");
  // The deadline lock runs on the first use after the deadline.
  for (const award of [safety, energy, design]) await call(award.staff, "GET", `/cycles/${award.cycleId}`);

  // Safety: judged to the end.
  for (const email of safety.applications.keys()) {
    if (email === SAFETY_PLAN.rejectProof.applicant) await checkProof(safety, email, "REJECTED", SAFETY_PLAN.rejectProof.note);
    else await checkProof(safety, email, "VERIFIED");
  }
  const board = await call<Board>(safety.staff, "GET", `/rounds/${safety.roundId}/assignment-board`);
  const conflictJuror = board.jury.find((j) => j.email === SAFETY_PLAN.conflict.juror);
  const conflictOrg = board.organisations.find((o) => o.name === ORGS.find((org) => org.key === SAFETY_PLAN.conflict.org)?.legalName);
  if (!conflictJuror || !conflictOrg) throw new Error("Can't find the conflict's juror or organisation");
  await call(safety.staff, "POST", `/cycles/${safety.cycleId}/conflicts`, { juryUserId: conflictJuror.id, organisationId: conflictOrg.id, note: SAFETY_PLAN.conflict.note });
  await assign(safety, SAFETY_PLAN.assignments);
  await score(safety, SAFETY_PLAN.assignments);
  const judging = await call<Judging>(safety.staff, "GET", `/rounds/${safety.roundId}/judging`);
  const correctedApp = safety.applications.get(SAFETY_PLAN.correction.applicant);
  const evaluation = judging.applications.find((a) => a.id === correctedApp)?.evaluations.find((e) => e.juror.email === SAFETY_PLAN.correction.juror);
  const indicatorKey = judging.sheet.flatMap((s) => s.indicators).find((i) => i.label === SAFETY_PLAN.correction.indicator)?.key;
  if (!evaluation || !indicatorKey) throw new Error("Can't find the evaluation to correct");
  const old = evaluation.marks[indicatorKey] ?? 5;
  await call(safety.staff, "POST", `/evaluations/${evaluation.id}/score-changes`, {
    changes: [{ indicatorKey, value: old < 10 ? old + 1 : old - 1 }],
    reason: SAFETY_PLAN.correction.reason,
  });
  await call(safety.staff, "POST", `/rounds/${safety.roundId}/send-for-approval`);
  await call(await signIn(safety.spec.head), "POST", `/rounds/${safety.roundId}/approve`, { remark: SAFETY_PLAN.approvalRemark });
  await call(safety.staff, "PUT", `/rounds/${safety.roundId}/results`, { mode: "TOP_N", n: SAFETY_PLAN.shortlist });
  await call(safety.staff, "POST", `/rounds/${safety.roundId}/publish-results`);
  log("Safety Excellence: judged, approved and results published.");

  // Design: scored and waiting for the head's approval.
  for (const email of design.applications.keys()) await checkProof(design, email, "VERIFIED");
  await assign(design, DESIGN_PLAN.assignments);
  await score(design, DESIGN_PLAN.assignments);
  await call(design.staff, "POST", `/rounds/${design.roundId}/send-for-approval`);
  log("Design Excellence: scored and waiting for the head's approval.");

  // Energy: closed, some proofs checked, ready to judge live.
  for (const email of ENERGY_PLAN.verify) await checkProof(energy, email, "VERIFIED");
  log("National Energy Efficiency: closed, ready for the proof check and assignment.");

  for (const session of sessions.values()) await call(session, "POST", "/auth/logout").catch(() => undefined);
  log("Done. Open the site and follow docs/DEMO.md.");
}

main().catch((error: unknown) => {
  console.error(`\nStopped: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
