import { env } from "../../config/env.js";
import { createDiskStorage } from "./disk.js";
import type { StorageDriver } from "./types.js";

export type { StorageDriver } from "./types.js";

/** The storage driver for this process, chosen by STORAGE_DRIVER. */
export const storage: StorageDriver = createDiskStorage(env.STORAGE_DISK_ROOT);
