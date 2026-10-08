# UI overview: how the platform looks and flows

> **What this is.** The client asked to see the platform before anything is built. This folder shows every user's journey **screen by screen**. It's a prototype of the flow: no real data, nothing is saved, and the final visual design will differ.
>
> **Phase 0.5** · 8 Oct 2026 · Related: [the plan](../PHASES.md) · [the spec](../requirements.md) · [re-plan options](../proposals/0.5-replan-options.md)

## How to open it

| File | What it is | How to open |
|---|---|---|
| [prototype.html](prototype.html) | **Clickable prototype**: 31 screens across 6 roles | Download the file (GitHub's "Download raw file" button) and open it in Chrome or Edge. Pick a role at the top, then use **Next →** or the arrow keys |
| [brand-value.html](brand-value.html) | **How we keep the organiser's brand**: 3 pages and a live site-builder demo | The same way |
| This page | The flows as diagrams, readable right here on GitHub | Scroll down |

Each prototype screen has yellow notes (which decision it shows) and red notes (which of the four rules it enforces).

---

## The whole journey of one award

```mermaid
flowchart LR
    A["Leader or PA<br/>creates a department<br/>for the organiser"] --> B["Department head<br/>sets the brand kit,<br/>adds staff"]
    B --> C["Staff<br/>set up the award<br/>and build its site"]
    C --> D["Applicants<br/>find the site, apply,<br/>upload proof"]
    D --> E["Staff<br/>check proof, mask,<br/>assign jury"]
    E --> F["Jury<br/>score"]
    F --> G["Department head<br/>approves<br/>(written rounds)"]
    G --> H["Staff<br/>publish results"]
    H -.->|if the award has an on-site round| I["Panel scores<br/>on site"]
    I -.-> H
```

---

## 1. Visitor

```mermaid
flowchart LR
    V1["Open awards<br/>branded cards"] --> V2["Award's own site<br/>sections, 499 / 500, Apply"] --> V3["Sign in or<br/>create account"]
```

| # | Screen | Shows | Prototype |
|---|---|---|---|
| 1 | Open awards | Each award as a card in its organiser's brand, with deadline and places left | `prototype.html#v-open` |
| 2 | Award's branded site | Built by staff from sections; deadline, places left, categories and past winners are filled automatically | `#v-site` |
| 3 | Sign in / register | One account per email, for every award and role | `#v-login` |

## 2. Applicant

```mermaid
flowchart LR
    A1["My organisation<br/>create once, or join"] --> A2["My applications"] --> A3["Start: pick category,<br/>pay fee if any"] --> A4["Form<br/>autosave, New / Updated"] --> A5["Proof documents<br/>ID, employment, LinkedIn"] --> A6["Review and submit<br/>entry limit checked"] --> A7["Status<br/>slot, result"]
```

| # | Screen | Shows | Prototype |
|---|---|---|---|
| 1 | My organisation | **Create** it once (first person from the company; PAN / GSTIN checks, values cleaned on save) or **Join** it (PAN + GSTIN, or PAN + official email); a PAN that already exists sends you to Join | `#a-org` |
| 2 | My applications | Friendly statuses only | `#a-apps` |
| 3 | Start and pay | Category fee; duplicate warning; demo payment | `#a-start` |
| 4 | Application form | Sections, progress, autosave, New / Updated markers (R4) | `#a-form` |
| 5 | Proof documents | Photo ID (masked Aadhaar only), proof of employment, LinkedIn, consent | `#a-proof` |
| 6 | Review and submit | Checklist; "499 / 500"; the 501st is refused | `#a-submit` |
| 7 | Status | Submitted → proof verified → shortlisted → presentation slot → medal | `#a-status` |

## 3. Staff

```mermaid
flowchart TD
    S1["My awards<br/>many awards per person"] --> S2["Award setup<br/>dates, fee, limit, blind,<br/>rounds, questions, scoring"]
    S2 --> S3["Site builder<br/>pages, sections, publish, versions"]
    S3 --> S4["Applications<br/>duplicates, proof status"]
    S4 --> S5["Proof check"] --> S6["Masking<br/>blind awards only"] --> S7["Jury pool, conflicts,<br/>assignment"]
    S7 --> S8["Judging progress<br/>score change needs a reason"] --> S9["Send for approval,<br/>then results"]
    S9 -.->|award has an on-site round| S10["On site: slots, panels,<br/>close, medals"]
```

| # | Screen | Shows | Prototype |
|---|---|---|---|
| 1 | My awards | Awards across departments | `#s-awards` |
| 2 | Award setup | Every difference between awards, set on screen; publish blocked until valid (R4) | `#s-setup` |
| 3 | Site builder | Pages, sections, layouts, preview, publish, restore | `#s-site` |
| 4 | Applications | Filters; duplicate flags; proof and masking status | `#s-apps` |
| 5 | Proof check | Verified, or Rejected with a reason | `#s-proof` |
| 6 | Masking | Original next to the masked copy; files masked or marked safe (R1) | `#s-mask` |
| 7 | Jury and assignment | Pool, recorded conflicts, one jury per application (R2) | `#s-assign` |
| 8 | Judging progress | Score correction with a reason, kept in history (R3) | `#s-judging` |
| 9 | Results | After approval: ranked list, Shortlisted / Rejected, publish | `#s-results` |
| 10 | On-site round | Slots, panels, staff backup entry, close, suggested medals | `#s-onsite` |

## 4. Jury

```mermaid
flowchart LR
    J1["My assignments"] --> J2["Score a written application<br/>masked copy, weights, overall note"]
    J1 --> J3["On site: score on a phone<br/>alone, never sees other scores"]
```

| # | Screen | Shows | Prototype |
|---|---|---|---|
| 1 | My assignments | Only their own applications and progress | `#j-list` |
| 2 | Scoring (written, blind) | Masked answers, no identity, no proof documents, no total (R1) | `#j-score` |
| 3 | On-site scoring | Phone screen; panel member scores alone | `#j-onsite` |

## 5. Department head (or an external organiser's lead)

```mermaid
flowchart LR
    H1["Department dashboard<br/>own awards only"] --> H2["Brand kit"]
    H1 --> H3["Staff and awards"]
    H1 --> H4["Approve a written round<br/>or send back"]
```

| # | Screen | Shows | Prototype |
|---|---|---|---|
| 1 | Department dashboard | An organiser running its awards on its own | `#h-dash` |
| 2 | Brand kit | Logo, colours (readability checked), font, links, live preview | `#h-brand` |
| 3 | Staff and awards | Invite staff, give them awards | `#h-staff` |
| 4 | Approve a round | Ranked list, notes, disqualified list; approve locks scores (R3) | `#h-review` |

## 6. Leader and PA

```mermaid
flowchart LR
    L1["Leader dashboard<br/>all 80 awards"] --> L2["Departments and organisers"]
    L1 --> L3["PA team and PA activity<br/>leader only"]
    L1 --> L4["Master data and<br/>organisation corrections"]
```

| # | Screen | Shows | Prototype |
|---|---|---|---|
| 1 | Leader dashboard | One trustworthy view across every award and department | `#l-dash` |
| 2 | Departments | Create a department for an external organiser and appoint its head | `#l-depts` |
| 3 | PA team | Invite or remove PAs; every PA action listed | `#l-pa` |
| 4 | Master data | Shared lists (retire, never delete); organisation corrections with a reason | `#l-master` |

---

## What the prototype doesn't show

- Final colours, fonts and illustrations (the look here is deliberately simple).
- Emails (listed in [spec §5.13](../requirements.md)), error states and empty states.
- Every edge case: it shows the main path of each journey.
