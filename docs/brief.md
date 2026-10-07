> Source: `Ten_Day_Problem_Awards_Platform.docx` — the original problem statement (the brief), converted to Markdown. Wording is unchanged; only headings and list formatting were added.

# Ten days: one platform for eighty award programmes

## The situation

An industry body in India runs about 80 awards and competitions. They cover business excellence, energy, safety, design, innovation and sustainability. There are also regional awards and shop-floor competitions like Kaizen and 5S.

Each award grew up on its own. Some take entries on their own website. A few use the organisation's member portal. One large award has a separate portal of its own. So applicants, jury members and staff each get a different experience depending on the award.

The organisation wants one platform to run all of them. Its own staff should be able to set up a new award without a developer.

The awards work in different ways:

- The largest one scores applicants on about 250 indicators across 15 areas. Its assessment runs six months, with two jury rounds.
- Another has 38 categories competing in the same cycle.
- Some charge an entry fee. Most do not.
- The shop-floor competitions may not fit the usual "fill a form, upload evidence" shape.

Four kinds of people use it:

- Applicants come once or twice a year, close to a deadline, with a long form to fill.
- Jury members are senior people who score in short gaps between other work.
- Programme staff work in the system every day while a cycle runs.
- Leadership wants one view across all the awards.

The platform has to keep four rules:

1. If an award uses blind judging, a jury member cannot see who applied.
2. The system must not give a jury member an application they have a conflict of interest with.
3. The system records who changed a score, and why.
4. An award can change its questions from one year to the next. Applications sent under last year's questions must still open and read correctly.

The client has not told us how many applications come in each year. We also don't know what data exists from past cycles. You will have to decide what to assume.

## Your task

A team would take months to build the whole platform. You have ten working days. Choosing what to build in that time is part of the work.

Build something small that runs. It should show one system handling two awards that work in different ways. A staff member should be able to set those differences without changing any code.

## Sending your work

We expect you to use GitHub for everything: the code, the requirements, your processes and your project plan. I should be able to open your repository at any point and see where you are.

I will read your progress every day, across all ten days. Three things count:

- **Your plan.** Keep it in GitHub. Update it when it changes, and tell me each time you do.
- **Your daily progress.** Share what you did, what comes next, and where you are stuck. A few lines is enough. If you go quiet, I will read that too.
- **Your decisions.** Write each one down when you make it. Give the options, the one you picked, why, and what would change your mind.

By the last day, your repository should also hold:

- The code, with a README a stranger can run from without asking you.
- One page showing the journey of each user you built for, plus a simple drawing of how the parts fit together.
- A list of what your tests check, and what they don't.

We finish with a 20-minute walkthrough together.

## The seven things I will read

1. **Abstraction.** The parts every award shares, the parts that change per award, and the point where your model breaks.
2. **Communication.** Your daily updates and your plan. Can I follow your thinking from what you wrote, without a meeting?
3. **Critical thinking.** Do you question this brief before you build? Tell me what you left out and why. Tell me when you drop one of your own ideas.
4. **User workflows.** Start from a real person's day. Walk one award cycle through the eyes of each user you picked.
5. **High-level architecture.** The shape of the system. Where each award's settings live, and how you keep one award's data apart from another's.
6. **Technical decisions.** The choices you made, and the options you turned down.
7. **Checking your own work.** Tests written from the four rules above. Your own review before you call a piece done. Code you would put your name on.

Use AI as much as you like. Show me one place where it gave you something that looked right but was wrong, and how you caught it.

## What you get

You get this page, and me. You will work from our office, with me.

I won't be free every time you need me. Plan your work ahead, and do your homework before you bring me a question. Your planning around my time is part of what I read.

I know this domain well. You can't talk to the client's staff, so I will answer the way their programme staff would.

You won't see the client's documents or data. Make up your own test data.

## Terms

Ten working days at your own pace, from our office.

If I can't see what I'm looking for along the way, I will tell you and we stop there. You keep everything you build.

---

## Addendum (7 Oct 2026): new needs raised during the build

*Not part of the original brief. Recorded from the owner's discussion with the mentor, so the requirements stay in one place. Analysis and proposals: [proposals/0.4-new-issues.md](proposals/0.4-new-issues.md).*

- Show how the platform will **look and flow** (UI screens for each user) before building it.
- Award organisers who already have their own website and brand value (example: FPO Awards, face-cii.in/fpo-awards) must be able to **keep that brand** when their award is listed on the platform. Staff need the freedom to build rich award pages (photos, several pages, categories, the form) **without a developer**, unlike today's minimal award listings.
- An organisation that brings its award to the platform runs it **on its own**: the leader creates a department for it, makes the organiser's person its head, and they then add their own staff and jury and see only their own data.
- **One entry per organisation** per award. Staff can **limit the number of entries**. The person filling in the form should prove they work for the organisation (for example a LinkedIn profile and a proof-of-employment document).
- Explore whether an organiser's award can **stand out**, including having its own domain.
