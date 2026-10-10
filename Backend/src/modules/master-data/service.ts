import { db } from "../../lib/db.js";
import { INDIAN_STATES } from "../../lib/states.js";
import { listItemView, stateView, type ListItemView, type StateView } from "./views.js";

/**
 * Shared lists every award uses (spec §5.18, ADR 0006). Reading them is open to everyone, since
 * forms need them before anyone is signed in. Only active values can be picked; retired ones
 * still show on old records. The leader's screens to add, rename and retire values: package 2.3.
 */
export async function listOrganisationTypes(): Promise<ListItemView[]> {
  const rows = await db.organisationType.findMany({ where: { retiredAt: null }, orderBy: { name: "asc" } });
  return rows.map(listItemView);
}

export async function listAwardDomains(): Promise<ListItemView[]> {
  const rows = await db.awardDomain.findMany({ where: { retiredAt: null }, orderBy: { name: "asc" } });
  return rows.map(listItemView);
}

/** States and union territories with their GST codes: a fixed list in code, not master data. */
export function listStates(): StateView[] {
  return INDIAN_STATES.map(stateView);
}
