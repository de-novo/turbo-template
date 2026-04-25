import { createRequestId, withLoggerContext } from "@repo/platform";
import type { NextFunction, Request, Response } from "express";

const REQUEST_ID_HEADER = "x-request-id";

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.headers[REQUEST_ID_HEADER];
  const requestId = typeof incoming === "string" && incoming ? incoming : createRequestId();
  res.setHeader(REQUEST_ID_HEADER, requestId);
  withLoggerContext({ requestId }, () => next());
}
