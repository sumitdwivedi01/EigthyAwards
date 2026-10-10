/**
 * Identity operations act only on the signed-in user's own account: the route turns the session
 * into an actor (or answers 401), and every service function works on actor.userId. No one can
 * change another person's profile, password or proof documents here; the leader's account
 * actions (deactivation, invites) arrive with package 2.3.
 */
export { requireSignedIn } from "../../lib/access.js";
