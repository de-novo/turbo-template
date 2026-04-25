import { Controller, Get, UseGuards } from "@nestjs/common";
import type { UserIdentity } from "@repo/auth";
import type { ApiSuccess } from "@repo/contracts";
import { AuthGuard } from "./auth/auth.guard.js";
import { CurrentUser } from "./auth/current-user.decorator.js";

@Controller()
export class AppController {
	@Get("/me")
	@UseGuards(AuthGuard)
	me(@CurrentUser() user: UserIdentity): ApiSuccess<UserIdentity> {
		return { ok: true, data: user };
	}
}
