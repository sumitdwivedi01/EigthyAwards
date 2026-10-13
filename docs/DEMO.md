# The demo: data, accounts and what to show

> **What this is.** How the live platform is filled with realistic demo data, the account to use for each part, and what each award lets the lead try. The data is created through the platform's own API, as people would on screen, so every rule, history entry and file is real.

## 1. What the demo contains

Five award departments, four awards at four different stages, so every step of an award can be seen or done live:

| Award department | Award | Stage | What to show with it |
|---|---|---|---|
| Safety, Health and Environment | **Safety Excellence Award 2026**: blind, ₹10,000 fee, one category, 2 to 3 jurors | **Results published** | The whole story: ranks and exact averages (ΣP ÷ n), a score corrected with its reason in the history, a recorded conflict, a rejected proof left unjudged, approval with a remark, applicants seeing their result |
| Design and Innovation | **Design Excellence Award 2026**: two categories, 2 jurors | **Waiting for the head's approval** | The head approves (scores lock for good); staff give the results and publish them |
| Energy and Climate | **National Energy Efficiency Award 2026**: category fees (₹5,000 and ₹1,000 for MSMEs), 2 jurors, evidence files | **Closed, ready to judge** | Staff check two pending proofs, record a conflict, assign jury from the board; two jurors score; staff send for approval; the head approves; staff publish |
| FPO Awards team (an external organiser) | **FPO Excellence Awards 2026**: free, four categories, entry limit 500, 1 juror | **Open until 30 Nov** | Applying live; "8 / 500" on the award page; a colleague blocked from a second application; a rejected proof the applicant can fix |
| Quality and Productivity | none | **People only** | Staff set up a new award live, on screen, with no code |

Behind them: **29 companies** (industry and farmer producer organisations, realistic but made up) with one applicant each, every applicant with a photo ID and LinkedIn link on their profile and a proof of employment per application. Every email address ends in `.example` or `demo.test`, so nothing ever reaches a real inbox (and production sends no email in Phase 1).

**Deadlines.** Production can't move its clock, so the three judged awards were given a deadline a few minutes after the script started; their pages show today's date as the deadline. The FPO award stays open until 30 November.

## 2. The accounts

Every account uses **the demo password**, except the leader, who has **the leader's password**. Both are chosen when the data is built, and are shared with the lead privately, never in Git or a document.

| Role | Account | Use it to |
|---|---|---|
| Leader | `leader@demo.test` | See every department and award on the dashboard; create a department with its head |
| Head, Design | `head.design@demo.test` (Kavita Sharma) | **Approve** the Design round waiting in the queue |
| Head, Energy | `head.energy@demo.test` (Rohan Kapoor) | Approve the Energy round once staff send it |
| Head, Safety | `head.she@demo.test` (Meera Iyer) | See an approved, published round; the department's people and theme |
| Head, FPO | `head.fpo@demo.test` (Arjun Patil) | An external organiser's department and its own colours |
| Head, Quality | `head.quality@demo.test` (Sanjay Gupta) | Add staff and jury (temporary passwords shown once) |
| Staff, Energy | `staff.imran@demo.test` (Imran Sheikh) | Check proofs, record a conflict, **assign jury**, correct a score, send for approval, publish |
| Staff, Design | `staff.karan@demo.test` (Karan Malhotra) | Give and publish results after the head approves |
| Staff, Safety | `staff.asha@demo.test` (Asha Rao) | Walk through a finished award: board, judging, history, results |
| Staff, FPO | `staff.ravi@demo.test` (Ravi Kumar) | The open award: applications list, filters, proof check |
| Staff, Quality | `staff.divya@demo.test` (Divya Saxena) | **Create an award live**: questions, scoring sheet, publish |
| Jury, Energy | `jury.rajesh@demo.test`, `jury.shalini@demo.test`, `jury.vivek@demo.test`, `jury.anil@demo.test` | Score Energy applications once assigned |
| Jury, Safety | `jury.anil@demo.test`, `jury.priya@demo.test`, `jury.nandini@demo.test`, `jury.vikram@demo.test` | See submitted, blind evaluations (no company, no files) |
| Jury, Design | `jury.aditi@demo.test`, `jury.manoj@demo.test`, `jury.priya@demo.test` | See submitted evaluations |
| Jury, FPO | `jury.sunita@demo.test`, `jury.farhan@demo.test`, `jury.lakshmi@demo.test`, `jury.vikram@demo.test` | Judge FPO entries after its deadline |
| Jury, Quality | `jury.gopal@demo.test`, `jury.rekha@demo.test` | The jury list for the award built live |
| Applicant | `applicant.kiran@demo.test` (Acme Steel) | **Shortlisted** in Safety; an Energy application under review |
| Applicant | `applicant.deepa@demo.test` (Coastal Chemicals) | Safety: proof rejected, so not judged |
| Applicant | `applicant.srinivas@demo.test` (Krishna Delta FPO) | **Apply live** to FPO Excellence from scratch |
| Applicant | `applicant.ganesh@demo.test` (Sahyadri FPO) | Finish a half-done draft (autosave) and submit |
| Applicant | `applicant.anita@demo.test` (Sahyadri FPO) | Ganesh's colleague: **blocked** from starting a second application, sees its status only |
| Applicant | `applicant.bhanwar@demo.test` (Thar Organic FPO) | Proof **rejected** with a reason: upload a new one |
| Applicant | `applicant.swati@demo.test` (Nashik Grapes FPO) | A submitted application with several evidence files |

The other applicants (`applicant.<first name>@demo.test`, listed in `Backend/scripts/demo-content.ts`) also log in with the demo password.

**On the login page.** With `NEXT_PUBLIC_DEMO_ACCOUNTS=on` in the Vercel project, the login page lists the main accounts above; picking one fills in the email. Passwords are never shown there.

## 3. A 20-minute walkthrough

| Minutes | Who | What |
|---|---|---|
| 0–2 | Visitor | The home page: open awards as branded cards. Open FPO Excellence: its colours, categories, "8 / 500" |
| 2–5 | Leader | The dashboard across all departments. Create a department ("Water Conservation") with a head: the temporary password is shown once |
| 5–9 | Divya (staff, Quality) | Create an award, an edition, a category, questions (publish version 1), a scoring sheet (weights balance themselves), publish: it appears on Open awards |
| 9–12 | Srinivas (applicant) | Apply to FPO Excellence: autosave, the file upload, the proof step, submit; the counter moves to 9 / 500. Then Anita: blocked |
| 12–16 | Imran (staff, Energy) | Verify the two pending proofs; record a conflict (the juror is greyed out); assign two jurors to each application from the board |
| | Rajesh, then Shalini (jury) | Score one application each, write the note, submit. Imran: the exact average with ΣP and n; correct one mark with a reason; the history shows who, when, old, new, why |
| 16–18 | Kavita (head, Design) | Approve the waiting round. Karan (staff): top 1 of each category, publish. Lotus or Kaveri's applicant sees the result |
| 18–20 | Asha (staff, Safety) | A finished award end to end; the tests for the four rules |

## 4. Building it on production (the owner)

Run from **`Backend/` in a VS Code terminal (PowerShell)**, on the branch with these scripts. Steps 3 and 4 **empty the production database for good**: everything there now is lost.

**1. Prepare.** Copy `Backend/live.env.example` to `Backend/.env.live` and fill it in: the Supabase connection (the same strings the Render service uses), the Vercel address as `APP_URL`, and **new** demo passwords. Wake the live site by opening it in a browser.

**2. Point this terminal at production.** Every command below then uses `.env.live`:

```powershell
$env:ENV_FILE = ".env.live"
```

**3. Check the target, then empty it.** The first command changes nothing and prints the database host; the second needs that host typed back:

```powershell
npm run db:wipe
```

```powershell
npm run db:wipe -- --confirm <the host it printed>
```

**4. Make sure the schema is current, then seed the people:**

```powershell
npx prisma migrate deploy
```

```powershell
npx prisma db seed
```

**5. Build the demo** (about 12 minutes, most of it waiting for the short deadline; leave the terminal open):

```powershell
npm run demo:data
```

If the production server is slow, give the short deadline more time, for example `npm run demo:data -- --minutes 12`. If it stops halfway, start again from step 3.

**6. Point the terminal back at your laptop** (or close it):

```powershell
Remove-Item Env:ENV_FILE
```

**7. Optional:** in Vercel → Settings → Environment Variables, add `NEXT_PUBLIC_DEMO_ACCOUNTS` = `on` for Production, then redeploy, so the login page lists the demo accounts. In Supabase → Storage, the old files of the wiped data can be deleted from the `applicant-files` bucket.

**8. Check:** log in as the leader (dashboard: 5 departments, 4 awards), as Kavita (one round waiting), as Kiran (Shortlisted), and open the FPO award page.

## 5. Locally

The same scripts work on a laptop database: `npm run db:wipe -- --confirm localhost`, `npx prisma db seed`, then `npm run demo:data -- --app http://localhost:3000` with the API and the screens running (`--minutes 3` is enough locally).
