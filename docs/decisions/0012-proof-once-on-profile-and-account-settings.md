# 0012. Identity proof once on the profile, a recent employment proof per application, and account settings

- Status: **Accepted** (lead call and owner, 2026-10-09)
- Date: 2026-10-09
- Related: spec §5.20, §5.21, §5.1, §10; changes part of ADR 0010 (proof documents); ADR 0003 (sessions)

## Context

ADR 0010 asked for three things with **every application**: a photo identity document, a proof of employment and a LinkedIn link. In the 9 Oct call the lead pointed out that a person's identity and LinkedIn profile don't change between awards. Uploading them again for every award is repeated work for the applicant and repeated storage of a sensitive document. What does change is **where the person works**, so the employment proof has to be current.

The same call asked that every user can manage their own account, including changing their password. Until now the spec only had "forgot password".

## Options for the proof

1. **Keep ADR 0010: all three with every application.** Simple to build. But it means repeated uploads and many copies of the same identity document. Turned down.
2. **Identity document and LinkedIn once on the profile; a recent employment proof per application; each award's staff check the proof for their own application.** ← chosen.
3. **As option 2, but the identity document is verified once for the whole platform** (the first staff member to verify it settles it for every award). Less checking work, but one award's staff would decide for all the others. Turned down by the owner. It is still the way to go if checking becomes a burden.

## Decision

- **On the profile (once):** the photo identity document (masked Aadhaar only, as before) and the LinkedIn link. The applicant can replace them at any time, and consent is asked at each upload.
- **Per application:** a proof of employment at the applying organisation, with the date on the document. That date must fall within the **3 months** before the upload (owner, 9 Oct), and can't be in the future.
- **Submit** needs all three: the profile's identity document and LinkedIn link, and the application's employment proof.
- **What an application uses:** at submit, the application records the identity document and LinkedIn link it used. These follow the profile until staff verify them or the deadline locks the application, and are fixed after that. This way a rejected identity document is fixed once, on the profile, and a verified one can't be swapped afterwards.
- **Checking:** the staff of **each award** check their own application (owner, 9 Oct). They see the profile's identity document and LinkedIn link next to this application's employment proof, and mark it Verified, or Rejected with a reason.
- **Retention:**
  - An employment proof is deleted 12 months after its cycle's results.
  - An identity document is deleted 12 months after the results of the last cycle that used it. If it was replaced before any application used it, it is deleted at once.
  - The "Verified / Rejected by whom and when" record is kept.
- **My profile (every user, every role):**
  - Edit name and phone.
  - **Change password**, which needs the current password. Every other session then ends: the session version increases, and the current session is renewed. A "password changed" email goes to the user, and an audit event is written without the password.
  - The email address can't be changed for now.

## Why

- Less work for applicants, who apply to several awards a year, and fewer copies of a sensitive document, which the DPDP Act's data-minimisation principle favours.
- A dated employment proof answers the real question ("does this person work there **now**?") better than a one-time upload.
- Per-award checking keeps each department responsible for its own applications, which fits external organisers who run their awards alone.
- Changing a password through `sessionVersion` reuses what ADR 0003 already has for deactivation and reset.

## Consequences

- **Data model:**
  - `User` gets `phone`, `linkedinUrl`, `identityFileId` and `passwordChangedAt`.
  - `FileAsset` can belong to a user (`ownerUserId`) instead of an application; `IDENTITY_PROOF` always does.
  - `FileAsset` gets `documentDate`, needed for `EMPLOYMENT_PROOF`, and `consentAt`.
  - `Application` gets `identityFileId`, and `linkedinUrl` becomes the copy taken at submit.
- **New service operations:** `getMyProfile`, `updateMyProfile`, `changePassword`, `setIdentityDocument`, `removeIdentityDocument`, `setLinkedinUrl`; `uploadProof` becomes `uploadEmploymentProof`.
- **New email templates:** "password changed" and "proof rejected".
- **New screen:** My profile. The applicant's proof step shrinks to one upload plus a date, and the proof-check screen shows the profile's documents next to the application's.
- **The clean-up job** must count how many applications use an identity document before deleting it.

## What would change our mind

- Staff find checking the same person's identity document for every award too much work: verify it once (option 3), possibly with a validity period.
- A legal review asks for shorter retention, or for deletion as soon as consent is withdrawn: change the retention rule. Withdrawing consent would then also block the person's pending applications.
- Applicants need to change their login email: add an email change with a confirmation link to the new address.
