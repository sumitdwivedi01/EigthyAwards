# EightyAwards: one platform for eighty award programmes

An industry body in India runs about **80 award programmes**, and each one runs on its own system. This repository plans and builds **one platform for all of them**, where organisations apply, juries score and staff run every award in one place, and staff can set up a new award **without a developer**.

**Read it in order.** Sections 1 to 6 explain the problem: what the awards are, how they are run today, and what has to change. The solution starts at [section 7](#7-the-solution-in-short). The original problem statement is in [docs/brief.md](docs/brief.md).

1. [The organisation and its awards](#1-the-organisation-and-its-awards)
2. [One award, from start to finish](#2-one-award-from-start-to-finish)
3. [How the awards are run today, and where it hurts](#3-how-the-awards-are-run-today-and-where-it-hurts)
4. [The words used here](#4-the-words-used-here)
5. [What must be the same, and what may differ](#5-what-must-be-the-same-and-what-may-differ)
6. [What we know, what we assumed, what is still open](#6-what-we-know-what-we-assumed-what-is-still-open)
7. [The solution in short](#7-the-solution-in-short)
8. [Status and plan](#8-status-and-plan)
9. [Where to look](#9-where-to-look)
10. [Running it](#10-running-it)

---

## 1. The organisation and its awards

**The client** is an industry body in India: an association of companies that works to raise the standard of Indian industry. Recognising good work is a large part of that, so it runs about 80 awards and competitions every year:

| Kind of award | What it recognises (for example) |
|---|---|
| Business excellence | How well a whole organisation is run: leadership, strategy, people, processes and results |
| Energy, safety, sustainability | Saving energy, preventing accidents, caring for the environment |
| Design and innovation | New products, processes and ideas |
| Regional awards | The same kinds of award, for one region of the country |
| Shop-floor competitions (Kaizen, 5S) | Teams of workers showing improvements they made on the factory floor |

**What an award programme is.** An award runs once a year; each year's run is a *cycle*. The organiser announces it with a deadline. An organisation that wants to take part sends an **application**: a long form describing its work in that field, with evidence. A **jury** of senior experts assesses every application against the same criteria and scores it, and the best are recognised (shortlisted, winners, or Gold, Silver and Bronze).

**Who applies.** The award goes to an **organisation**, identified by its PAN (India's tax number), never to one of its plants or branches. One person fills in the form on its behalf, for example a steel company's safety manager. An organisation sends at most one application to each award.

**Why organisations apply** (general background, not the client's words): the award is recognition they can show customers, investors and employees; it measures them against the same criteria as their peers; and senior experts take a close look at how they work. For the industry body, the awards spread good practice, because winners become examples for the rest of industry.

**The scale and the differences** (from the client):

- An award receives about **300 to 500 applications**.
- The largest award scores each applicant on about **250 indicators across 15 areas**, takes **six months**, and has **two jury rounds**; the second is a live presentation.
- Another award has **38 categories** competing in the same cycle.
- Some awards charge an **entry fee**; most don't.
- Shop-floor competitions don't fit "fill in a form, upload evidence": teams are judged on the spot.

The terms *area*, *indicator* and *category* are explained in [section 4](#4-the-words-used-here).

---

## 2. One award, from start to finish

An example made up for this project, shaped like the real awards: the **Safety Excellence Award 2026**.

| Step | Who | What happens | In the example |
|---|---|---|---|
| 1. Set up | The award's staff | Choose this year's dates, fee, categories, questions and how the answers will be scored | Opens 1 January, closes 31 March; fee ₹10,000; judged blind; three sections of questions |
| 2. Apply | One person per organisation | Registers the organisation, fills in the long form, adds evidence and proof that they work there, and submits before the deadline | Kiran, safety manager at Acme Steel Ltd, describes the plant's training, incident reporting and audits |
| 3. Close | — | At the deadline every application locks | Forms that weren't submitted no longer count |
| 4. Check | The award's staff | Check each application is genuine and complete: one per organisation, and the applicant's proof | Staff verify Kiran's ID and proof of employment |
| 5. Assess | The jury: senior experts | Each juror scores the application alone, against the award's scoring sheet; in a blind award they don't see which company applied | Two safety experts mark Acme's answers without seeing its name |
| 6. Decide | The department head | Reviews the ranked list and approves it; after that, no score can change | Acme ranks 3rd of 40 |
| 7. Results | The award's staff | Publish the results; each applicant sees theirs | Acme is shortlisted |

**Bigger and smaller awards.** In a large award, steps 5 and 6 come twice: the shortlisted organisations then present live to a panel, and the panel decides Gold, Silver and Bronze. A shop-floor competition needs almost no form: teams present on site, and the panel scores them there.

**What a juror's scoring sheet looks like.** The score is out of 100. The award splits it into **areas**, each area into **indicators**, and each part has a weight:

| Area (share of the score) | Indicator (share of its area) | One juror's mark (0–10) |
|---|---|---|
| Training (40%) | Share of workers trained this year (60%) | 8 |
| | Quality of refresher training (40%) | 5 |
| Incidents (60%) | How incidents are investigated (50%) | 7 |
| | External safety audit passed (50%, Yes/No) | Yes |

This juror's score is **78.2 out of 100**. When several jurors score the same application, its final score is the average of their scores. The largest real award has a sheet like this with about 250 indicators in 15 areas. The exact formula, with a worked example: [ADR 0019](docs/decisions/0019-exact-score-arithmetic.md).

---

## 3. How the awards are run today, and where it hurts

**Each award grew up on its own.** Some take entries on their own website. A few use the organisation's member portal. One large award has a separate portal of its own. Much of the work around them is done by hand. So applicants, jury and staff get a different experience in every award, and nothing connects one award to another.

| Who | Their day | Where it becomes hard today |
|---|---|---|
| **Applicant** | Comes once or twice a year, close to a deadline, with a long form | A different website, login and form for each award; the organisation's details typed in again every time |
| **Jury member** | A senior person who scores in short gaps between other work | A different scoring format per award, and little time: scoring has to be easy to stop and pick up again |
| **Staff** | Work in the system every day while a cycle runs | Setting up a new award, or changing one question, needs a developer |
| **Leadership** | Wants one view across all the awards | The data sits in separate systems and doesn't match, so the figures can't be added up |

**The client's biggest problem is inconsistent data.** The same company ends up recorded differently in each system:

| Where | How the same company appears |
|---|---|
| An award's own website | Acme Steel Ltd |
| The member portal | ACME STEEL LIMITED |
| The largest award's portal | Acme Steels, Pune unit |

A report counts these as three companies. Leadership can't say how many organisations take part, or which ones do well across several awards.

---

## 4. The words used here

| Word | Meaning | Example |
|---|---|---|
| **Award** | A programme that runs every year | Safety Excellence Award |
| **Cycle** | One year's run of an award, with its own dates, questions and scoring | The 2026 cycle |
| **Entry category** | A group of applicants who compete only with each other inside one cycle, each group ranked separately. "38 categories" means 38 such groups in the same cycle | Large manufacturing; small and medium businesses |
| **Area** | One part of the assessment, with its own share of the score. "15 areas" means the score is split into 15 parts | Training; Environment |
| **Indicator** | One thing the jury marks inside an area: a mark from 0 to 10, or Yes/No, with its own weight. "250 indicators" means each juror gives about 250 marks per application | Share of workers trained |
| **Question** | What the applicant answers in the form. Each indicator belongs to a question; applicants never see the indicators | "Describe your safety training" |
| **Round** | One stage of judging: a written review of the forms, or presentations on site | Round 1 written, round 2 on site |
| **Jury** | The senior experts who score. Several can score one application, each on their own; the average counts | |
| **Blind judging** | The jury don't see which organisation applied, so the name can't sway the score | |
| **Conflict of interest** | A link between a juror and an applicant, such as a former employer, that means they must not judge it | |
| **Kaizen, 5S** | Shop-floor methods: Kaizen is many small, continuous improvements; 5S keeps a workplace sorted, orderly and clean | A team's Kaizen project |
| **Department** | The team that runs a group of awards: part of the industry body, or an outside organiser running its own awards on the platform | The FPO Awards team (awards for farmer producer organisations) |

The full glossary is in [docs/requirements.md §2](docs/requirements.md#2-glossary).

---

## 5. What must be the same, and what may differ

Is the problem that the awards follow different processes, or that separate software makes them hard to run? **Both, in different ways.**

- **The differences between awards are real, and they stay.** An award with 38 categories, or 250 indicators and two rounds, genuinely works differently from a Kaizen competition.
- **The separate software is what has to go.** Each system was built around one award, so the steps every award shares are rebuilt each time, shared data such as company details never matches, and every difference needs a developer.

So the platform builds the shared parts once, and turns every difference into a **setting** that staff choose on screen:

| The same for every award (built once) | Different for each award (settings chosen by staff) |
|---|---|
| One record per organisation, person and department | The questions and their sections |
| Logins and roles: applicant, staff, jury, department head, leader | The scoring sheet: areas, indicators, weights |
| The steps: set up → apply → close → check → assess → decide → results | Dates, entry fee (or free), entry categories |
| Giving applications to the jury, and the scoring maths | Blind or not; how many jurors score each application |
| A history of every important change | The rounds (written, on site, or both) and the names of the results |
| The four rules below | An entry limit, and the award's own page and branding |

**Four rules every award must keep** (from the brief):

| Rule | Why it matters |
|---|---|
| 1. In a blind award, a juror can't see who applied | The jury score the work, not the name |
| 2. A juror is never given an application they have a conflict of interest with | Nobody judges a friend, a former employer or a rival |
| 3. Every change to a score records who made it, when, and why | Results can be trusted and checked later |
| 4. An award can change its questions next year, and last year's applications still open and read correctly | Past entries stay readable after the form changes |

---

## 6. What we know, what we assumed, what is still open

**From the brief and the client's answers:** about 80 awards on separate systems (own websites, the member portal, one separate portal); the numbers in section 1; the four kinds of user and their days; the four rules; the award goes to the organisation, one application each; staff can cap the number of entries; the applicant proves they work for the organisation (photo ID, LinkedIn profile, recent proof of employment), with no signed letter; outside organisers keep their own brand and run their awards on their own.

**What we assumed** (to be confirmed):

- How each current system works in detail; we haven't seen them. We read "done by hand" as forms, scores and results passed around as files and spreadsheets.
- Volume: about 80 awards × 300 to 500 applications, so up to about **40,000 applications a year**.
- Past years' data isn't brought over: consistent data starts with each award's first cycle on the platform.
- Why organisations apply (section 1) is general background.

**Still open:** the questions for the lead are at the end of [docs/PLAN.md](docs/PLAN.md#open-questions-for-the-lead-none-of-them-blocks-phase-1); every gap and undecided point, with the default we use until it's answered, is in [docs/GAPS.md](docs/GAPS.md).

---

## 7. The solution in short

**An award is settings, not code.** The platform does the steps every award shares; each award only fills in its own settings, on screen.

- **One record per organisation** (one PAN) and per person, cleaned when saved and shared by every award, so leadership's figures add up.
- **Staff set up an award on screen:** questions (each published version is frozen), the scoring sheet with weights that must total 100%, dates, fee, blind judging, categories, rounds and an entry limit.
- **The organiser's people are set up on screen:** the leader creates a department and its head; the head adds their staff and jury.
- **Fair judging:** staff give each application to one or more jurors; each scores alone and never sees the others' marks; the final score is their exact average; every later change needs a reason; the department head approves.
- **The four rules are enforced by the server**, not just hidden on screen, and automated tests check each one.

Two demo awards show it. They differ only in settings; no code mentions either:

| | Award A: Safety Excellence 2026 | Award B: FPO Excellence 2026 |
|---|---|---|
| Blind judging | On | Off |
| Entry fee | ₹10,000 (demo payment) | Free |
| Categories | 1 | 4 |
| Jurors per application | 2 to 3, averaged | 1 |
| Entry limit | None | 500, shown as "499 / 500" |

**How it is built:** `Front-End/` is a Next.js app on Vercel, with screens only and no business rules. `Backend/` is an Express and TypeScript API on Render, a modular monolith of 16 modules where every check happens on the server. PostgreSQL and file storage are on Supabase. More: [docs/overview/](docs/overview/) (in pictures) and [docs/TECHNICAL-DESIGN.md](docs/TECHNICAL-DESIGN.md).

---

## 8. Status and plan

The work is delivered in **three phases** ([docs/PLAN.md](docs/PLAN.md)):

| Phase | What it delivers | When |
|---|---|---|
| **1. Working platform** | Two different awards run end to end online, set up on screen with no code; the four rules enforced and tested | 10–15 October 2026 |
| **2. Complete product** | On-site rounds and medals, the full site builder, invitations by email, all emails, end-to-end tests | About 23 working days |
| **3. Launch-ready** | Security and privacy reviews, load testing, real payments, own web addresses, client testing | About 15 working days, plus client testing |

**Now (11 Oct):** Step 1.1 is built and merged into `staging`: logins, roles, applicant and platform accounts, My profile and organisations, with 136 tests. Next is Step 1.2: departments and people on screen, then award setup. The walkthrough is on Thursday 15 October. Live status: [docs/PROGRESS.md](docs/PROGRESS.md) and [Daily.md](Daily.md).

---

## 9. Where to look

| You want… | Open |
|---|---|
| The plan: three phases, dates, what's in each | [docs/PLAN.md](docs/PLAN.md) |
| Phase 1, day by day, and the walkthrough | [docs/PHASE-1-ROADMAP.md](docs/PHASE-1-ROADMAP.md) |
| The platform in pictures | [docs/overview/](docs/overview/) |
| What it looks like: clickable prototype, flows per role | [docs/ui/](docs/ui/README.md) |
| How it's built: architecture, data model, API | [docs/TECHNICAL-DESIGN.md](docs/TECHNICAL-DESIGN.md), [docs/API.md](docs/API.md) |
| Decisions, with the options and reasons | [docs/decisions/](docs/decisions/) |
| What's missing, contradictory or undecided | [docs/GAPS.md](docs/GAPS.md) |
| The full specification | [docs/requirements.md](docs/requirements.md) |
| Where the project stands; the daily log | [docs/PROGRESS.md](docs/PROGRESS.md), [Daily.md](Daily.md) |
| Where AI output looked right but was wrong | [docs/ai-notes.md](docs/ai-notes.md) |

---

## 10. Running it

You need Node.js 22 and Docker Desktop. In one terminal, the API:

```bash
cd Backend
cp .env.example .env     # set AUTH_SECRET, LEADER_PASSWORD and DEMO_PASSWORD (comments inside)
npm ci
docker compose up -d     # PostgreSQL and Mailpit
npm run db:deploy && npm run db:seed
npm run dev              # http://localhost:4000/api/health
```

In a second terminal, the screens:

```bash
cd Front-End
cp .env.example .env.local
npm ci
npm run dev              # http://localhost:3000
```

Log in with a demo account (listed in [docs/PROGRESS.md](docs/PROGRESS.md#seeded-test-accounts)), or register as an applicant. More detail: [Backend/README.md](Backend/README.md) and [Front-End/README.md](Front-End/README.md). The live link comes with Step 1.5 (14–15 October).
