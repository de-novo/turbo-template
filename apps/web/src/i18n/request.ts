import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

/**
 * Server-side message loader. Called once per request by next-intl
 * before the React tree starts rendering. Falls back to the default
 * locale when the URL segment is missing or unknown — the middleware
 * normally redirects those, but this guard keeps SSR safe in edge
 * cases (404 page, direct fetch to a server component, etc.).
 *
 * Wired into Next via `createNextIntlPlugin('./src/i18n/request.ts')`
 * in next.config.ts.
 */
export default getRequestConfig(async ({ requestLocale }) => {
	const requested = await requestLocale;
	const locale = hasLocale(routing.locales, requested)
		? requested
		: routing.defaultLocale;

	return {
		locale,
		messages: (await import(`../../messages/${locale}.json`)).default,
	};
});
