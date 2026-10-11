/**
 * Award pages (spec §3, §5.19): an award's staff choose its page's address; the public pages need
 * no login and show only published editions, never people or applications.
 */
export { requireStaffOfAward } from "../../lib/access.js";
