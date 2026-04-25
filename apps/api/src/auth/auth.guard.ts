import {
	type CanActivate,
	type ExecutionContext,
	Injectable,
	UnauthorizedException,
} from "@nestjs/common";
import { toContractSession } from "@repo/auth-server";
import type { Request as ExpressRequest } from "express";
import { AuthService } from "./auth.service.js";
import type { RequestWithSession } from "./types.js";

@Injectable()
export class AuthGuard implements CanActivate {
	constructor(private readonly authService: AuthService) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const req = context
			.switchToHttp()
			.getRequest<ExpressRequest & RequestWithSession>();

		const rawSession = await this.authService.auth.api.getSession({
			headers: toFetchHeaders(req.headers),
		});

		const session = toContractSession(rawSession);
		if (!session) {
			throw new UnauthorizedException("No valid session.");
		}

		req.session = session;
		return true;
	}
}

function toFetchHeaders(
	headers: import("node:http").IncomingHttpHeaders,
): Headers {
	const out = new Headers();
	for (const [key, value] of Object.entries(headers)) {
		if (value === undefined) continue;
		if (Array.isArray(value)) {
			for (const v of value) out.append(key, v);
		} else {
			out.set(key, value);
		}
	}
	return out;
}
