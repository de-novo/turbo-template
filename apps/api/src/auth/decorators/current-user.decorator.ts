import { type ExecutionContext, createParamDecorator } from "@nestjs/common";
import type { AuthInstance } from "../auth.js";

type SessionUser = NonNullable<Awaited<ReturnType<AuthInstance["api"]["getSession"]>>>["user"];

/**
 * Pulls the Better Auth user from the request, populated by `AuthenticatedGuard`.
 * Use only on routes that have `@UseGuards(AuthenticatedGuard)`; without the
 * guard the value is undefined and the route signature is lying about safety.
 */
export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
  const req = ctx.switchToHttp().getRequest<{ user?: SessionUser }>();
  return req.user;
});

export type { SessionUser };
