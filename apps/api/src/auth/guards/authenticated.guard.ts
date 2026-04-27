import { type CanActivate, type ExecutionContext, Inject, Injectable } from "@nestjs/common";
import { AppError } from "@repo/platform";
import { fromNodeHeaders } from "better-auth/node";
import type { Request } from "express";
import type { AuthInstance } from "../auth.js";
import { AUTH_INSTANCE } from "../auth.tokens.js";

/**
 * NestJS guard that requires a valid Better Auth session. Attaches the resolved
 * `user` and `session` to the request so `@CurrentUser()` can read them.
 *
 * Throws `AppError("UNAUTHORIZED", …)` on:
 *   - missing/expired session (the common 401 case)
 *   - the API not being in `AUTH_MODE=better-auth-embedded` (the embedded
 *     instance is null — operators using external-oidc / sso-gateway must
 *     write their own guard against the upstream IdP)
 *
 * `AppErrorFilter` (registered in `app.module.ts`) maps both cases to the
 * `{ ok: false, error: { code: "UNAUTHORIZED", message } }` envelope.
 */
@Injectable()
export class AuthenticatedGuard implements CanActivate {
  constructor(@Inject(AUTH_INSTANCE) private readonly auth: AuthInstance | null) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    if (!this.auth) {
      throw new AppError({
        code: "UNAUTHORIZED",
        message:
          "Embedded auth is not configured; AuthenticatedGuard requires AUTH_MODE=better-auth-embedded.",
      });
    }
    const req = ctx.switchToHttp().getRequest<Request>();
    const session = await this.auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });
    if (!session) {
      throw new AppError({ code: "UNAUTHORIZED", message: "Authentication required." });
    }
    // Attach for @CurrentUser() and downstream interceptors. We avoid mutating
    // typed Express interfaces here — the @CurrentUser decorator does the cast.
    Object.assign(req, { user: session.user, session: session.session });
    return true;
  }
}
