import type { IncomingHttpHeaders } from "node:http";
import { All, Controller, Req, Res } from "@nestjs/common";
import { ApiExcludeController } from "@nestjs/swagger";
import type {
	Request as ExpressRequest,
	Response as ExpressResponse,
} from "express";
import { AuthService } from "./auth.service.js";

@ApiExcludeController()
@Controller("auth")
export class AuthController {
	constructor(private readonly authService: AuthService) {}

	@All("*splat")
	async handle(
		@Req() req: ExpressRequest,
		@Res() res: ExpressResponse,
	): Promise<void> {
		const url = new URL(
			req.originalUrl ?? req.url,
			`http://${req.headers.host ?? "localhost"}`,
		);

		const fetchRequest = new globalThis.Request(url, {
			method: req.method,
			headers: toFetchHeaders(req.headers),
			body: buildRequestBody(req),
		});

		const fetchResponse = await this.authService.auth.handler(fetchRequest);

		res.status(fetchResponse.status);
		fetchResponse.headers.forEach((value, key) => {
			res.setHeader(key, value);
		});

		const buffer = Buffer.from(await fetchResponse.arrayBuffer());
		res.end(buffer);
	}
}

function toFetchHeaders(headers: IncomingHttpHeaders): Record<string, string> {
	const out: Record<string, string> = {};
	for (const [key, value] of Object.entries(headers)) {
		if (value === undefined) continue;
		out[key] = Array.isArray(value) ? value.join(", ") : value;
	}
	return out;
}

function buildRequestBody(req: ExpressRequest): BodyInit | null {
	if (req.method === "GET" || req.method === "HEAD") return null;
	const body = (req as unknown as { body?: unknown }).body;
	if (body === undefined || body === null) return null;
	if (typeof body === "string") return body;
	if (body instanceof ArrayBuffer) return body;
	return JSON.stringify(body);
}
