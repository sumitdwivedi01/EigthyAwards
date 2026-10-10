import type { Actor } from "../lib/access.js";

declare global {
  namespace Express {
    interface Request {
      /** The signed-in user with their scoped roles, or null (set by src/middleware/actor.ts). */
      actor: Actor | null;
    }
  }
}

export {};
