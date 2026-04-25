import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

/**
 * Locale-aware routing. Detects the user's preferred locale from the
 * Accept-Language header on first hit, then sets a cookie so future
 * requests skip the negotiation. Subdirectory strategy: `/en/...`,
 * `/ko/...`. The default locale is also prefixed (i.e. `/` redirects
 * to `/en`) so URLs are unambiguous and link tracking is consistent.
 */
export default createMiddleware(routing);

export const config = {
	// Match anything that isn't an internal Next route (`_next`,
	// `_vercel`), an asset (`favicon.ico`, files containing a dot),
	// or an API route.
	matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
