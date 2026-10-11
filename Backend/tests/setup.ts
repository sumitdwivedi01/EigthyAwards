import { afterEach } from "vitest";
import { resetClock } from "../src/lib/clock.js";

// Every test starts with the real clock.
afterEach(() => {
  resetClock();
});
