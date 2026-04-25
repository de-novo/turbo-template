import { defineRouting } from "next-intl/routing";

/**
 * Locale registry for the web app.
 *
 * Add a new locale in three steps:
 *
 * 1. Append its IETF tag (e.g. "ja") to `locales` below.
 * 2. Add `messages/<tag>.json` with the same shape as `en.json`.
 * 3. (Optional) update `localePrefix` if you want the default locale
 *    served at `/` instead of `/en` — see the next-intl docs for the
 *    full matrix.
 *
 * The middleware in `src/middleware.ts` reads this object directly,
 * so no other place needs touching.
 */
export const routing = defineRouting({
	locales: ["en", "ko"],
	defaultLocale: "en",
});

export type Locale = (typeof routing.locales)[number];
