import type { IncomingHttpHeaders } from "node:http";
import type { Session } from "@repo/auth";

export type RequestWithSession = {
	method: string;
	url: string;
	originalUrl?: string;
	headers: IncomingHttpHeaders;
	body?: unknown;
	session?: Session;
};

export type AuthenticatedRequest = RequestWithSession & {
	session: Session;
};
