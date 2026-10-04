# Here You can see my daily working in the project so you can understand better what's going on in Daily bases

# DAY 1
 prepared questions I am gonna ask to my client before assuming things by my own to give a structure and design a high level architecture of the problem statement and which will eventually gonna help me to understand the problem more breifly and deep dive more 

# DAY 2
 Finally back on the work after some break , now will update regularly what's going on - and keep updating and pushing in github

**Done**
- Moved the brief, the spec and the architecture PDF into the repo (`docs/`), so everything lives in GitHub.
- Wrote the build plan: 15 phases (0 to 14), backend first. Each phase gets its own branch, is tested, and is then merged into `main`. See [docs/PHASES.md](docs/PHASES.md).
- Started the progress tracker ([docs/PROGRESS.md](docs/PROGRESS.md)) and the gaps list ([docs/GAPS.md](docs/GAPS.md)). Found 11 places where the spec contradicts itself, and 15 new gaps that come from hosting on Vercel + Render + Supabase.
- Wrote down 4 decisions in [docs/decisions/](docs/decisions/): splitting the frontend and the API, the tech stack, how login works, and the git workflow.

**Next**
- Merge Phase 0. Then Phase 1: the backend foundation (Express + TypeScript, the full database schema, test setup, CI).

**Stuck**
- Nothing is blocking. 10 decisions are still open in GAPS.md §A; I'm building on the defaults until they're answered.

**Plan changed**
- This is the first version of the plan. The main change from the spec: two apps (frontend on Vercel, API on Render, database on Supabase) instead of one Next.js app. See [ADR 0001](docs/decisions/0001-frontend-backend-split-and-hosting.md).
