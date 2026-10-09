# 0009. Branded award sites built from ready-made sections

- Status: **Accepted** (owner's answers, 7 Oct 2026)
- Date: 2026-10-07
- Related: spec §5.19; proposal [0.4-new-issues.md](../proposals/0.4-new-issues.md) §2 and §5; GAPS §J

## Context

Award organisers such as the team behind FPO Awards have their own websites and brand value. Today's award listings (e.g. CII's) are minimal. If organisers bring their awards to this platform, they must keep their brand and get rich, multi-page award sites (photos, categories, the form) **without a developer**. The FPO Awards site is built from about ten standard sections: banner, eligibility, about, objectives, categories, process, gallery, past winners, contacts and footer.

## Options

1. **A plain award page with fixed fields** (name, description, dates). Simple, but no brand or richness: the problem stays.
2. **Free design** (custom HTML, CSS or a drag-anywhere canvas). Maximum freedom, but layouts break on phones, scripts can steal logins, accessibility can't be checked, and support costs explode. Turned down.
3. **Link out to the organiser's own website.** Keeps the brand, but the data and the experience stay split across systems. Kept only as an extra option ("Apply" links from their site still work).
4. **Ready-made sections plus a brand kit, chosen and arranged by staff.** ← chosen. Website builders and award-management software follow the same pattern.

## Decision

Option 4, for **all** awards:

- **A brand kit per department** (logo, colours, a font from a safe list, social links, footer), with per-award overrides of colours and banner.
- **A site per award** with a Home page and extra pages. Staff decide **what to show and where**: the sections, their pages, their order and their layout options.
- **Automatic sections** fill in from platform data: the deadline, the entry count against the limit, categories and fees, key dates, past winners, and jury (when staff choose to show them).
- **Draft, preview, publish; change at any time**, including after publishing. Every publish is a new immutable version (like form versions), and an earlier version can be restored.
- **No approval** by the leader. The leader can view sites but not edit them.
- **Guardrails:** no HTML or scripts, limited rich text, brand colours with a contrast warning, images re-encoded with alt text required, and a public bucket kept apart from private files.
- **Address:** `/awards/<slug>` now. Sub-domains and own domains are **designed for, not built**: a slug and an empty `customDomain` field are stored, so they're configuration later.

## Why

- Organisers get real brand presence with no developer and no risk of breaking the platform.
- The automatic sections are a step **beyond** a normal website: the deadline, categories and past winners can't go out of date. That's the data-consistency goal again.
- It reuses proven parts of our design: immutable versions (rule 4's pattern), the audit log, department scopes.

## Consequences

- New tables: `BrandKit`, `AwardSite`, `SitePage`, `SitePageVersion`, `MediaAsset`. A new `sites` module (18 modules).
- New build phases: a backend phase for sites, the public renderer in the frontend foundation, and the page builder with the setup screens.
- The Open awards page becomes a set of branded cards.
- A public storage bucket is needed in production (Supabase Storage).

## What would change our mind

- Organisers repeatedly ask for a section type we don't have: add the section type (it's data plus one renderer), don't open up free HTML.
- Demand for own domains appears early: build the sub-domain step first. It needs a domain we own and wildcard DNS on Vercel.
