import { createParamDecorator, type ExecutionContext } from "@nestjs/common";
import type { UserIdentity } from "@repo/auth";
import type { RequestWithSession } from "./types.js";

export const CurrentUser = createParamDecorator(
	(_data: unknown, context: ExecutionContext): UserIdentity => {
		const req = context.switchToHttp().getRequest<RequestWithSession>();
		if (!req.session) {
			throw new Error(
				"CurrentUser used on an unauthenticated route. Apply AuthGuard first.",
			);
		}
		return req.session.user;
	},
);
