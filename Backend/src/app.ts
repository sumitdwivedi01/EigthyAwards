import { randomUUID } from "node:crypto";
import express, { type Express } from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import { pinoHttp } from "pino-http";
import { env } from "./config/env.js";
import { logger } from "./lib/logger.js";
import { buildApiRouter } from "./routes.js";
import { errorHandler, notFoundHandler } from "./middleware/error-handler.js";

const REQUEST_ID = /^[A-Za-z0-9-]{8,64}$/;

/** Builds the Express app. Tests use this too, without opening a port. */
export function createApp(): Express {
  const app = express();
  app.disable("x-powered-by");

  app.use(
    pinoHttp({
      logger,
      genReqId(req, res) {
        const incoming = req.headers["x-request-id"];
        const id = typeof incoming === "string" && REQUEST_ID.test(incoming) ? incoming : randomUUID();
        res.setHeader("x-request-id", id);
        return id;
      },
    }),
  );
  app.use(helmet());
  // Only the frontend may call the API from a browser, with cookies.
  app.use(cors({ origin: env.APP_URL, credentials: true }));
  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());

  app.use("/api", buildApiRouter());

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
