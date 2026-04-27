import { Controller, Get, UseGuards } from "@nestjs/common";
import { CurrentUser, type SessionUser } from "../auth/decorators/current-user.decorator.js";
import { AuthenticatedGuard } from "../auth/guards/authenticated.guard.js";

/**
 * Reference endpoint demonstrating `AuthenticatedGuard` + `@CurrentUser()`.
 * Returns the authenticated user; 401 (UNAUTHORIZED) when no session is
 * presented. Replace or extend in your fork — the wiring is the value here.
 */
@Controller("/me")
@UseGuards(AuthenticatedGuard)
export class MeController {
  @Get()
  me(@CurrentUser() user: SessionUser) {
    return {
      ok: true,
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    };
  }
}
