/**
 * Who may do what with an organisation (spec §3): any signed-in person may register one or join
 * one (they then apply for it); only its members see and edit it, and anyone else gets "not found"
 * so its existence isn't revealed. Staff, department heads and the leader see an organisation
 * through the applications they may see (Step 1.3); the leader's corrections come in package 2.3.
 */
export { requireOrgMember } from "../../lib/access.js";
