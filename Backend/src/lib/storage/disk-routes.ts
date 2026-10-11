import { Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { Router } from "express";
import { env } from "../../config/env.js";
import { clock } from "../clock.js";
import { ForbiddenError, StateError, ValidationError } from "../errors.js";
import { storage } from "./index.js";
import { verifyGrant } from "./signed-links.js";

/** Passes bytes through, and fails once more than `maxBytes` have gone by. */
function limitBytes(maxBytes: number): Transform {
  let seen = 0;
  return new Transform({
    transform(chunk: Buffer, _encoding, callback) {
      seen += chunk.length;
      if (seen > maxBytes) {
        callback(new ValidationError("The file is larger than its upload link allows."));
        return;
      }
      callback(null, chunk);
    },
  });
}

function mediaType(header: string | undefined): string | undefined {
  return header?.split(";")[0]?.trim().toLowerCase();
}

/**
 * The disk driver's upload and download links. The token is the permission: the service issued
 * it after its own access check, and it names one key, one action and an expiry. Supabase
 * Storage serves these links itself in production, so these routes exist only with the disk
 * driver.
 */
export function buildDiskStorageRouter(): Router {
  const router = Router();

  router.put("/uploads/:token", async (req, res) => {
    const grant = verifyGrant(req.params.token, env.AUTH_SECRET, "put", clock.now());
    if (!grant || grant.m === undefined) throw new ForbiddenError("This upload link is invalid or has expired.");
    if (mediaType(req.get("content-type")) !== grant.t) {
      throw new ValidationError("The file type doesn't match this upload link.");
    }
    const declared = Number(req.get("content-length"));
    if (Number.isFinite(declared) && declared > grant.m) {
      throw new ValidationError("The file is larger than its upload link allows.");
    }
    // One upload per link: an object that exists (perhaps already checked by staff) is never overwritten.
    if (await storage.statObject(grant.k)) throw new StateError("This upload link has already been used.");
    const limited = limitBytes(grant.m);
    req.on("error", (error) => limited.destroy(error));
    await storage.putObject(grant.k, req.pipe(limited));
    res.status(204).end();
  });

  router.get("/downloads/:token", async (req, res) => {
    const grant = verifyGrant(req.params.token, env.AUTH_SECRET, "get", clock.now());
    if (!grant) throw new ForbiddenError("This download link is invalid or has expired.");
    const body = await storage.getObject(grant.k);
    // attachment() guesses a type from the name, so the stored type is set after it.
    res.attachment(grant.n ?? "file");
    res.setHeader("Content-Type", grant.t);
    await pipeline(body, res);
  });

  return router;
}
