import { env } from "../../config/env.js";
import { createDiskStorage } from "./disk.js";
import { createSupabaseStorage } from "./supabase.js";
import type { StorageDriver } from "./types.js";

export type { StorageDriver, UploadLink } from "./types.js";

/** The storage driver for this process, chosen by STORAGE_DRIVER: local disk, or Supabase Storage online. */
export const storage: StorageDriver =
  env.STORAGE_DRIVER === "supabase" && env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY
    ? createSupabaseStorage({ url: env.SUPABASE_URL, serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY, bucket: env.SUPABASE_BUCKET })
    : createDiskStorage(env.STORAGE_DISK_ROOT, { signingSecret: env.AUTH_SECRET });
