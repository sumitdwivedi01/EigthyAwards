import type { Prisma } from "../../generated/prisma/client.js";
import { findState } from "../../lib/states.js";

export const organisationInclude = {
  orgType: { select: { id: true, name: true } },
} satisfies Prisma.OrganisationInclude;

export type OrganisationRecord = Prisma.OrganisationGetPayload<{ include: typeof organisationInclude }>;

/** The organisation as its own members see it: the full profile (spec §13 privacy). */
export interface OrganisationView {
  id: string;
  legalName: string;
  pan: string;
  gstin: string | null;
  addressLine: string;
  city: string;
  state: { code: string; name: string };
  pincode: string;
  officialEmail: string;
  phone: string;
  organisationType: { id: string; name: string } | null;
  cin: string | null;
  website: string | null;
}

export function organisationView(org: OrganisationRecord): OrganisationView {
  return {
    id: org.id,
    legalName: org.legalName,
    pan: org.pan,
    gstin: org.gstin,
    addressLine: org.addressLine,
    city: org.city,
    state: { code: org.stateCode, name: findState(org.stateCode)?.name ?? org.stateCode },
    pincode: org.pincode,
    officialEmail: org.officialEmail,
    phone: org.phone,
    organisationType: org.orgType,
    cin: org.cin,
    website: org.website,
  };
}

/** A saved organisation, with anything worth a second look that didn't stop the save. */
export interface OrganisationResult {
  organisation: OrganisationView;
  warnings: string[];
}
